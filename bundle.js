(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":4,"timers":5}],6:[function(require,module,exports){
var docx = require('docx')
},{"docx":7}],7:[function(require,module,exports){
(function (Buffer,setImmediate){(function (){
/*! For license information please see index.js.LICENSE.txt */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.docx=t():e.docx=t()}(globalThis,(()=>(()=>{var e={9742:(e,t)=>{"use strict";t.byteLength=function(e){var t=c(e),r=t[0],n=t[1];return 3*(r+n)/4-n},t.toByteArray=function(e){var t,r,i=c(e),o=i[0],a=i[1],u=new s(function(e,t,r){return 3*(t+r)/4-r}(0,o,a)),l=0,h=a>0?o-4:o;for(r=0;r<h;r+=4)t=n[e.charCodeAt(r)]<<18|n[e.charCodeAt(r+1)]<<12|n[e.charCodeAt(r+2)]<<6|n[e.charCodeAt(r+3)],u[l++]=t>>16&255,u[l++]=t>>8&255,u[l++]=255&t;return 2===a&&(t=n[e.charCodeAt(r)]<<2|n[e.charCodeAt(r+1)]>>4,u[l++]=255&t),1===a&&(t=n[e.charCodeAt(r)]<<10|n[e.charCodeAt(r+1)]<<4|n[e.charCodeAt(r+2)]>>2,u[l++]=t>>8&255,u[l++]=255&t),u},t.fromByteArray=function(e){for(var t,n=e.length,s=n%3,i=[],o=16383,a=0,c=n-s;a<c;a+=o)i.push(u(e,a,a+o>c?c:a+o));return 1===s?(t=e[n-1],i.push(r[t>>2]+r[t<<4&63]+"==")):2===s&&(t=(e[n-2]<<8)+e[n-1],i.push(r[t>>10]+r[t>>4&63]+r[t<<2&63]+"=")),i.join("")};for(var r=[],n=[],s="undefined"!=typeof Uint8Array?Uint8Array:Array,i="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",o=0,a=i.length;o<a;++o)r[o]=i[o],n[i.charCodeAt(o)]=o;function c(e){var t=e.length;if(t%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var r=e.indexOf("=");return-1===r&&(r=t),[r,r===t?0:4-r%4]}function u(e,t,n){for(var s,i,o=[],a=t;a<n;a+=3)s=(e[a]<<16&16711680)+(e[a+1]<<8&65280)+(255&e[a+2]),o.push(r[(i=s)>>18&63]+r[i>>12&63]+r[i>>6&63]+r[63&i]);return o.join("")}n["-".charCodeAt(0)]=62,n["_".charCodeAt(0)]=63},8764:(e,t,r)=>{"use strict";const n=r(9742),s=r(645),i="function"==typeof Symbol&&"function"==typeof Symbol.for?Symbol.for("nodejs.util.inspect.custom"):null;t.Buffer=c,t.SlowBuffer=function(e){return+e!=e&&(e=0),c.alloc(+e)},t.INSPECT_MAX_BYTES=50;const o=2147483647;function a(e){if(e>o)throw new RangeError('The value "'+e+'" is invalid for option "size"');const t=new Uint8Array(e);return Object.setPrototypeOf(t,c.prototype),t}function c(e,t,r){if("number"==typeof e){if("string"==typeof t)throw new TypeError('The "string" argument must be of type string. Received type number');return h(e)}return u(e,t,r)}function u(e,t,r){if("string"==typeof e)return function(e,t){if("string"==typeof t&&""!==t||(t="utf8"),!c.isEncoding(t))throw new TypeError("Unknown encoding: "+t);const r=0|m(e,t);let n=a(r);const s=n.write(e,t);return s!==r&&(n=n.slice(0,s)),n}(e,t);if(ArrayBuffer.isView(e))return function(e){if(q(e,Uint8Array)){const t=new Uint8Array(e);return d(t.buffer,t.byteOffset,t.byteLength)}return p(e)}(e);if(null==e)throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof e);if(q(e,ArrayBuffer)||e&&q(e.buffer,ArrayBuffer))return d(e,t,r);if("undefined"!=typeof SharedArrayBuffer&&(q(e,SharedArrayBuffer)||e&&q(e.buffer,SharedArrayBuffer)))return d(e,t,r);if("number"==typeof e)throw new TypeError('The "value" argument must not be of type number. Received type number');const n=e.valueOf&&e.valueOf();if(null!=n&&n!==e)return c.from(n,t,r);const s=function(e){if(c.isBuffer(e)){const t=0|f(e.length),r=a(t);return 0===r.length||e.copy(r,0,0,t),r}return void 0!==e.length?"number"!=typeof e.length||Z(e.length)?a(0):p(e):"Buffer"===e.type&&Array.isArray(e.data)?p(e.data):void 0}(e);if(s)return s;if("undefined"!=typeof Symbol&&null!=Symbol.toPrimitive&&"function"==typeof e[Symbol.toPrimitive])return c.from(e[Symbol.toPrimitive]("string"),t,r);throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof e)}function l(e){if("number"!=typeof e)throw new TypeError('"size" argument must be of type number');if(e<0)throw new RangeError('The value "'+e+'" is invalid for option "size"')}function h(e){return l(e),a(e<0?0:0|f(e))}function p(e){const t=e.length<0?0:0|f(e.length),r=a(t);for(let n=0;n<t;n+=1)r[n]=255&e[n];return r}function d(e,t,r){if(t<0||e.byteLength<t)throw new RangeError('"offset" is outside of buffer bounds');if(e.byteLength<t+(r||0))throw new RangeError('"length" is outside of buffer bounds');let n;return n=void 0===t&&void 0===r?new Uint8Array(e):void 0===r?new Uint8Array(e,t):new Uint8Array(e,t,r),Object.setPrototypeOf(n,c.prototype),n}function f(e){if(e>=o)throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+o.toString(16)+" bytes");return 0|e}function m(e,t){if(c.isBuffer(e))return e.length;if(ArrayBuffer.isView(e)||q(e,ArrayBuffer))return e.byteLength;if("string"!=typeof e)throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type '+typeof e);const r=e.length,n=arguments.length>2&&!0===arguments[2];if(!n&&0===r)return 0;let s=!1;for(;;)switch(t){case"ascii":case"latin1":case"binary":return r;case"utf8":case"utf-8":return V(e).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*r;case"hex":return r>>>1;case"base64":return X(e).length;default:if(s)return n?-1:V(e).length;t=(""+t).toLowerCase(),s=!0}}function w(e,t,r){let n=!1;if((void 0===t||t<0)&&(t=0),t>this.length)return"";if((void 0===r||r>this.length)&&(r=this.length),r<=0)return"";if((r>>>=0)<=(t>>>=0))return"";for(e||(e="utf8");;)switch(e){case"hex":return k(this,t,r);case"utf8":case"utf-8":return S(this,t,r);case"ascii":return N(this,t,r);case"latin1":case"binary":return R(this,t,r);case"base64":return A(this,t,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return C(this,t,r);default:if(n)throw new TypeError("Unknown encoding: "+e);e=(e+"").toLowerCase(),n=!0}}function g(e,t,r){const n=e[t];e[t]=e[r],e[r]=n}function y(e,t,r,n,s){if(0===e.length)return-1;if("string"==typeof r?(n=r,r=0):r>2147483647?r=2147483647:r<-2147483648&&(r=-2147483648),Z(r=+r)&&(r=s?0:e.length-1),r<0&&(r=e.length+r),r>=e.length){if(s)return-1;r=e.length-1}else if(r<0){if(!s)return-1;r=0}if("string"==typeof t&&(t=c.from(t,n)),c.isBuffer(t))return 0===t.length?-1:b(e,t,r,n,s);if("number"==typeof t)return t&=255,"function"==typeof Uint8Array.prototype.indexOf?s?Uint8Array.prototype.indexOf.call(e,t,r):Uint8Array.prototype.lastIndexOf.call(e,t,r):b(e,[t],r,n,s);throw new TypeError("val must be string, number or Buffer")}function b(e,t,r,n,s){let i,o=1,a=e.length,c=t.length;if(void 0!==n&&("ucs2"===(n=String(n).toLowerCase())||"ucs-2"===n||"utf16le"===n||"utf-16le"===n)){if(e.length<2||t.length<2)return-1;o=2,a/=2,c/=2,r/=2}function u(e,t){return 1===o?e[t]:e.readUInt16BE(t*o)}if(s){let n=-1;for(i=r;i<a;i++)if(u(e,i)===u(t,-1===n?0:i-n)){if(-1===n&&(n=i),i-n+1===c)return n*o}else-1!==n&&(i-=i-n),n=-1}else for(r+c>a&&(r=a-c),i=r;i>=0;i--){let r=!0;for(let n=0;n<c;n++)if(u(e,i+n)!==u(t,n)){r=!1;break}if(r)return i}return-1}function v(e,t,r,n){r=Number(r)||0;const s=e.length-r;n?(n=Number(n))>s&&(n=s):n=s;const i=t.length;let o;for(n>i/2&&(n=i/2),o=0;o<n;++o){const n=parseInt(t.substr(2*o,2),16);if(Z(n))return o;e[r+o]=n}return o}function x(e,t,r,n){return $(V(t,e.length-r),e,r,n)}function _(e,t,r,n){return $(function(e){const t=[];for(let r=0;r<e.length;++r)t.push(255&e.charCodeAt(r));return t}(t),e,r,n)}function E(e,t,r,n){return $(X(t),e,r,n)}function T(e,t,r,n){return $(function(e,t){let r,n,s;const i=[];for(let o=0;o<e.length&&!((t-=2)<0);++o)r=e.charCodeAt(o),n=r>>8,s=r%256,i.push(s),i.push(n);return i}(t,e.length-r),e,r,n)}function A(e,t,r){return 0===t&&r===e.length?n.fromByteArray(e):n.fromByteArray(e.slice(t,r))}function S(e,t,r){r=Math.min(e.length,r);const n=[];let s=t;for(;s<r;){const t=e[s];let i=null,o=t>239?4:t>223?3:t>191?2:1;if(s+o<=r){let r,n,a,c;switch(o){case 1:t<128&&(i=t);break;case 2:r=e[s+1],128==(192&r)&&(c=(31&t)<<6|63&r,c>127&&(i=c));break;case 3:r=e[s+1],n=e[s+2],128==(192&r)&&128==(192&n)&&(c=(15&t)<<12|(63&r)<<6|63&n,c>2047&&(c<55296||c>57343)&&(i=c));break;case 4:r=e[s+1],n=e[s+2],a=e[s+3],128==(192&r)&&128==(192&n)&&128==(192&a)&&(c=(15&t)<<18|(63&r)<<12|(63&n)<<6|63&a,c>65535&&c<1114112&&(i=c))}}null===i?(i=65533,o=1):i>65535&&(i-=65536,n.push(i>>>10&1023|55296),i=56320|1023&i),n.push(i),s+=o}return function(e){const t=e.length;if(t<=I)return String.fromCharCode.apply(String,e);let r="",n=0;for(;n<t;)r+=String.fromCharCode.apply(String,e.slice(n,n+=I));return r}(n)}t.kMaxLength=o,c.TYPED_ARRAY_SUPPORT=function(){try{const e=new Uint8Array(1),t={foo:function(){return 42}};return Object.setPrototypeOf(t,Uint8Array.prototype),Object.setPrototypeOf(e,t),42===e.foo()}catch(e){return!1}}(),c.TYPED_ARRAY_SUPPORT||"undefined"==typeof console||"function"!=typeof console.error||console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."),Object.defineProperty(c.prototype,"parent",{enumerable:!0,get:function(){if(c.isBuffer(this))return this.buffer}}),Object.defineProperty(c.prototype,"offset",{enumerable:!0,get:function(){if(c.isBuffer(this))return this.byteOffset}}),c.poolSize=8192,c.from=function(e,t,r){return u(e,t,r)},Object.setPrototypeOf(c.prototype,Uint8Array.prototype),Object.setPrototypeOf(c,Uint8Array),c.alloc=function(e,t,r){return function(e,t,r){return l(e),e<=0?a(e):void 0!==t?"string"==typeof r?a(e).fill(t,r):a(e).fill(t):a(e)}(e,t,r)},c.allocUnsafe=function(e){return h(e)},c.allocUnsafeSlow=function(e){return h(e)},c.isBuffer=function(e){return null!=e&&!0===e._isBuffer&&e!==c.prototype},c.compare=function(e,t){if(q(e,Uint8Array)&&(e=c.from(e,e.offset,e.byteLength)),q(t,Uint8Array)&&(t=c.from(t,t.offset,t.byteLength)),!c.isBuffer(e)||!c.isBuffer(t))throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');if(e===t)return 0;let r=e.length,n=t.length;for(let s=0,i=Math.min(r,n);s<i;++s)if(e[s]!==t[s]){r=e[s],n=t[s];break}return r<n?-1:n<r?1:0},c.isEncoding=function(e){switch(String(e).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},c.concat=function(e,t){if(!Array.isArray(e))throw new TypeError('"list" argument must be an Array of Buffers');if(0===e.length)return c.alloc(0);let r;if(void 0===t)for(t=0,r=0;r<e.length;++r)t+=e[r].length;const n=c.allocUnsafe(t);let s=0;for(r=0;r<e.length;++r){let t=e[r];if(q(t,Uint8Array))s+t.length>n.length?(c.isBuffer(t)||(t=c.from(t)),t.copy(n,s)):Uint8Array.prototype.set.call(n,t,s);else{if(!c.isBuffer(t))throw new TypeError('"list" argument must be an Array of Buffers');t.copy(n,s)}s+=t.length}return n},c.byteLength=m,c.prototype._isBuffer=!0,c.prototype.swap16=function(){const e=this.length;if(e%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(let t=0;t<e;t+=2)g(this,t,t+1);return this},c.prototype.swap32=function(){const e=this.length;if(e%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(let t=0;t<e;t+=4)g(this,t,t+3),g(this,t+1,t+2);return this},c.prototype.swap64=function(){const e=this.length;if(e%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(let t=0;t<e;t+=8)g(this,t,t+7),g(this,t+1,t+6),g(this,t+2,t+5),g(this,t+3,t+4);return this},c.prototype.toString=function(){const e=this.length;return 0===e?"":0===arguments.length?S(this,0,e):w.apply(this,arguments)},c.prototype.toLocaleString=c.prototype.toString,c.prototype.equals=function(e){if(!c.isBuffer(e))throw new TypeError("Argument must be a Buffer");return this===e||0===c.compare(this,e)},c.prototype.inspect=function(){let e="";const r=t.INSPECT_MAX_BYTES;return e=this.toString("hex",0,r).replace(/(.{2})/g,"$1 ").trim(),this.length>r&&(e+=" ... "),"<Buffer "+e+">"},i&&(c.prototype[i]=c.prototype.inspect),c.prototype.compare=function(e,t,r,n,s){if(q(e,Uint8Array)&&(e=c.from(e,e.offset,e.byteLength)),!c.isBuffer(e))throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type '+typeof e);if(void 0===t&&(t=0),void 0===r&&(r=e?e.length:0),void 0===n&&(n=0),void 0===s&&(s=this.length),t<0||r>e.length||n<0||s>this.length)throw new RangeError("out of range index");if(n>=s&&t>=r)return 0;if(n>=s)return-1;if(t>=r)return 1;if(this===e)return 0;let i=(s>>>=0)-(n>>>=0),o=(r>>>=0)-(t>>>=0);const a=Math.min(i,o),u=this.slice(n,s),l=e.slice(t,r);for(let e=0;e<a;++e)if(u[e]!==l[e]){i=u[e],o=l[e];break}return i<o?-1:o<i?1:0},c.prototype.includes=function(e,t,r){return-1!==this.indexOf(e,t,r)},c.prototype.indexOf=function(e,t,r){return y(this,e,t,r,!0)},c.prototype.lastIndexOf=function(e,t,r){return y(this,e,t,r,!1)},c.prototype.write=function(e,t,r,n){if(void 0===t)n="utf8",r=this.length,t=0;else if(void 0===r&&"string"==typeof t)n=t,r=this.length,t=0;else{if(!isFinite(t))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");t>>>=0,isFinite(r)?(r>>>=0,void 0===n&&(n="utf8")):(n=r,r=void 0)}const s=this.length-t;if((void 0===r||r>s)&&(r=s),e.length>0&&(r<0||t<0)||t>this.length)throw new RangeError("Attempt to write outside buffer bounds");n||(n="utf8");let i=!1;for(;;)switch(n){case"hex":return v(this,e,t,r);case"utf8":case"utf-8":return x(this,e,t,r);case"ascii":case"latin1":case"binary":return _(this,e,t,r);case"base64":return E(this,e,t,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return T(this,e,t,r);default:if(i)throw new TypeError("Unknown encoding: "+n);n=(""+n).toLowerCase(),i=!0}},c.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};const I=4096;function N(e,t,r){let n="";r=Math.min(e.length,r);for(let s=t;s<r;++s)n+=String.fromCharCode(127&e[s]);return n}function R(e,t,r){let n="";r=Math.min(e.length,r);for(let s=t;s<r;++s)n+=String.fromCharCode(e[s]);return n}function k(e,t,r){const n=e.length;(!t||t<0)&&(t=0),(!r||r<0||r>n)&&(r=n);let s="";for(let n=t;n<r;++n)s+=Y[e[n]];return s}function C(e,t,r){const n=e.slice(t,r);let s="";for(let e=0;e<n.length-1;e+=2)s+=String.fromCharCode(n[e]+256*n[e+1]);return s}function O(e,t,r){if(e%1!=0||e<0)throw new RangeError("offset is not uint");if(e+t>r)throw new RangeError("Trying to access beyond buffer length")}function L(e,t,r,n,s,i){if(!c.isBuffer(e))throw new TypeError('"buffer" argument must be a Buffer instance');if(t>s||t<i)throw new RangeError('"value" argument is out of bounds');if(r+n>e.length)throw new RangeError("Index out of range")}function D(e,t,r,n,s){z(t,n,s,e,r,7);let i=Number(t&BigInt(4294967295));e[r++]=i,i>>=8,e[r++]=i,i>>=8,e[r++]=i,i>>=8,e[r++]=i;let o=Number(t>>BigInt(32)&BigInt(4294967295));return e[r++]=o,o>>=8,e[r++]=o,o>>=8,e[r++]=o,o>>=8,e[r++]=o,r}function P(e,t,r,n,s){z(t,n,s,e,r,7);let i=Number(t&BigInt(4294967295));e[r+7]=i,i>>=8,e[r+6]=i,i>>=8,e[r+5]=i,i>>=8,e[r+4]=i;let o=Number(t>>BigInt(32)&BigInt(4294967295));return e[r+3]=o,o>>=8,e[r+2]=o,o>>=8,e[r+1]=o,o>>=8,e[r]=o,r+8}function F(e,t,r,n,s,i){if(r+n>e.length)throw new RangeError("Index out of range");if(r<0)throw new RangeError("Index out of range")}function B(e,t,r,n,i){return t=+t,r>>>=0,i||F(e,0,r,4),s.write(e,t,r,n,23,4),r+4}function M(e,t,r,n,i){return t=+t,r>>>=0,i||F(e,0,r,8),s.write(e,t,r,n,52,8),r+8}c.prototype.slice=function(e,t){const r=this.length;(e=~~e)<0?(e+=r)<0&&(e=0):e>r&&(e=r),(t=void 0===t?r:~~t)<0?(t+=r)<0&&(t=0):t>r&&(t=r),t<e&&(t=e);const n=this.subarray(e,t);return Object.setPrototypeOf(n,c.prototype),n},c.prototype.readUintLE=c.prototype.readUIntLE=function(e,t,r){e>>>=0,t>>>=0,r||O(e,t,this.length);let n=this[e],s=1,i=0;for(;++i<t&&(s*=256);)n+=this[e+i]*s;return n},c.prototype.readUintBE=c.prototype.readUIntBE=function(e,t,r){e>>>=0,t>>>=0,r||O(e,t,this.length);let n=this[e+--t],s=1;for(;t>0&&(s*=256);)n+=this[e+--t]*s;return n},c.prototype.readUint8=c.prototype.readUInt8=function(e,t){return e>>>=0,t||O(e,1,this.length),this[e]},c.prototype.readUint16LE=c.prototype.readUInt16LE=function(e,t){return e>>>=0,t||O(e,2,this.length),this[e]|this[e+1]<<8},c.prototype.readUint16BE=c.prototype.readUInt16BE=function(e,t){return e>>>=0,t||O(e,2,this.length),this[e]<<8|this[e+1]},c.prototype.readUint32LE=c.prototype.readUInt32LE=function(e,t){return e>>>=0,t||O(e,4,this.length),(this[e]|this[e+1]<<8|this[e+2]<<16)+16777216*this[e+3]},c.prototype.readUint32BE=c.prototype.readUInt32BE=function(e,t){return e>>>=0,t||O(e,4,this.length),16777216*this[e]+(this[e+1]<<16|this[e+2]<<8|this[e+3])},c.prototype.readBigUInt64LE=J((function(e){W(e>>>=0,"offset");const t=this[e],r=this[e+7];void 0!==t&&void 0!==r||G(e,this.length-8);const n=t+256*this[++e]+65536*this[++e]+this[++e]*2**24,s=this[++e]+256*this[++e]+65536*this[++e]+r*2**24;return BigInt(n)+(BigInt(s)<<BigInt(32))})),c.prototype.readBigUInt64BE=J((function(e){W(e>>>=0,"offset");const t=this[e],r=this[e+7];void 0!==t&&void 0!==r||G(e,this.length-8);const n=t*2**24+65536*this[++e]+256*this[++e]+this[++e],s=this[++e]*2**24+65536*this[++e]+256*this[++e]+r;return(BigInt(n)<<BigInt(32))+BigInt(s)})),c.prototype.readIntLE=function(e,t,r){e>>>=0,t>>>=0,r||O(e,t,this.length);let n=this[e],s=1,i=0;for(;++i<t&&(s*=256);)n+=this[e+i]*s;return s*=128,n>=s&&(n-=Math.pow(2,8*t)),n},c.prototype.readIntBE=function(e,t,r){e>>>=0,t>>>=0,r||O(e,t,this.length);let n=t,s=1,i=this[e+--n];for(;n>0&&(s*=256);)i+=this[e+--n]*s;return s*=128,i>=s&&(i-=Math.pow(2,8*t)),i},c.prototype.readInt8=function(e,t){return e>>>=0,t||O(e,1,this.length),128&this[e]?-1*(255-this[e]+1):this[e]},c.prototype.readInt16LE=function(e,t){e>>>=0,t||O(e,2,this.length);const r=this[e]|this[e+1]<<8;return 32768&r?4294901760|r:r},c.prototype.readInt16BE=function(e,t){e>>>=0,t||O(e,2,this.length);const r=this[e+1]|this[e]<<8;return 32768&r?4294901760|r:r},c.prototype.readInt32LE=function(e,t){return e>>>=0,t||O(e,4,this.length),this[e]|this[e+1]<<8|this[e+2]<<16|this[e+3]<<24},c.prototype.readInt32BE=function(e,t){return e>>>=0,t||O(e,4,this.length),this[e]<<24|this[e+1]<<16|this[e+2]<<8|this[e+3]},c.prototype.readBigInt64LE=J((function(e){W(e>>>=0,"offset");const t=this[e],r=this[e+7];void 0!==t&&void 0!==r||G(e,this.length-8);const n=this[e+4]+256*this[e+5]+65536*this[e+6]+(r<<24);return(BigInt(n)<<BigInt(32))+BigInt(t+256*this[++e]+65536*this[++e]+this[++e]*2**24)})),c.prototype.readBigInt64BE=J((function(e){W(e>>>=0,"offset");const t=this[e],r=this[e+7];void 0!==t&&void 0!==r||G(e,this.length-8);const n=(t<<24)+65536*this[++e]+256*this[++e]+this[++e];return(BigInt(n)<<BigInt(32))+BigInt(this[++e]*2**24+65536*this[++e]+256*this[++e]+r)})),c.prototype.readFloatLE=function(e,t){return e>>>=0,t||O(e,4,this.length),s.read(this,e,!0,23,4)},c.prototype.readFloatBE=function(e,t){return e>>>=0,t||O(e,4,this.length),s.read(this,e,!1,23,4)},c.prototype.readDoubleLE=function(e,t){return e>>>=0,t||O(e,8,this.length),s.read(this,e,!0,52,8)},c.prototype.readDoubleBE=function(e,t){return e>>>=0,t||O(e,8,this.length),s.read(this,e,!1,52,8)},c.prototype.writeUintLE=c.prototype.writeUIntLE=function(e,t,r,n){e=+e,t>>>=0,r>>>=0,n||L(this,e,t,r,Math.pow(2,8*r)-1,0);let s=1,i=0;for(this[t]=255&e;++i<r&&(s*=256);)this[t+i]=e/s&255;return t+r},c.prototype.writeUintBE=c.prototype.writeUIntBE=function(e,t,r,n){e=+e,t>>>=0,r>>>=0,n||L(this,e,t,r,Math.pow(2,8*r)-1,0);let s=r-1,i=1;for(this[t+s]=255&e;--s>=0&&(i*=256);)this[t+s]=e/i&255;return t+r},c.prototype.writeUint8=c.prototype.writeUInt8=function(e,t,r){return e=+e,t>>>=0,r||L(this,e,t,1,255,0),this[t]=255&e,t+1},c.prototype.writeUint16LE=c.prototype.writeUInt16LE=function(e,t,r){return e=+e,t>>>=0,r||L(this,e,t,2,65535,0),this[t]=255&e,this[t+1]=e>>>8,t+2},c.prototype.writeUint16BE=c.prototype.writeUInt16BE=function(e,t,r){return e=+e,t>>>=0,r||L(this,e,t,2,65535,0),this[t]=e>>>8,this[t+1]=255&e,t+2},c.prototype.writeUint32LE=c.prototype.writeUInt32LE=function(e,t,r){return e=+e,t>>>=0,r||L(this,e,t,4,4294967295,0),this[t+3]=e>>>24,this[t+2]=e>>>16,this[t+1]=e>>>8,this[t]=255&e,t+4},c.prototype.writeUint32BE=c.prototype.writeUInt32BE=function(e,t,r){return e=+e,t>>>=0,r||L(this,e,t,4,4294967295,0),this[t]=e>>>24,this[t+1]=e>>>16,this[t+2]=e>>>8,this[t+3]=255&e,t+4},c.prototype.writeBigUInt64LE=J((function(e,t=0){return D(this,e,t,BigInt(0),BigInt("0xffffffffffffffff"))})),c.prototype.writeBigUInt64BE=J((function(e,t=0){return P(this,e,t,BigInt(0),BigInt("0xffffffffffffffff"))})),c.prototype.writeIntLE=function(e,t,r,n){if(e=+e,t>>>=0,!n){const n=Math.pow(2,8*r-1);L(this,e,t,r,n-1,-n)}let s=0,i=1,o=0;for(this[t]=255&e;++s<r&&(i*=256);)e<0&&0===o&&0!==this[t+s-1]&&(o=1),this[t+s]=(e/i>>0)-o&255;return t+r},c.prototype.writeIntBE=function(e,t,r,n){if(e=+e,t>>>=0,!n){const n=Math.pow(2,8*r-1);L(this,e,t,r,n-1,-n)}let s=r-1,i=1,o=0;for(this[t+s]=255&e;--s>=0&&(i*=256);)e<0&&0===o&&0!==this[t+s+1]&&(o=1),this[t+s]=(e/i>>0)-o&255;return t+r},c.prototype.writeInt8=function(e,t,r){return e=+e,t>>>=0,r||L(this,e,t,1,127,-128),e<0&&(e=255+e+1),this[t]=255&e,t+1},c.prototype.writeInt16LE=function(e,t,r){return e=+e,t>>>=0,r||L(this,e,t,2,32767,-32768),this[t]=255&e,this[t+1]=e>>>8,t+2},c.prototype.writeInt16BE=function(e,t,r){return e=+e,t>>>=0,r||L(this,e,t,2,32767,-32768),this[t]=e>>>8,this[t+1]=255&e,t+2},c.prototype.writeInt32LE=function(e,t,r){return e=+e,t>>>=0,r||L(this,e,t,4,2147483647,-2147483648),this[t]=255&e,this[t+1]=e>>>8,this[t+2]=e>>>16,this[t+3]=e>>>24,t+4},c.prototype.writeInt32BE=function(e,t,r){return e=+e,t>>>=0,r||L(this,e,t,4,2147483647,-2147483648),e<0&&(e=4294967295+e+1),this[t]=e>>>24,this[t+1]=e>>>16,this[t+2]=e>>>8,this[t+3]=255&e,t+4},c.prototype.writeBigInt64LE=J((function(e,t=0){return D(this,e,t,-BigInt("0x8000000000000000"),BigInt("0x7fffffffffffffff"))})),c.prototype.writeBigInt64BE=J((function(e,t=0){return P(this,e,t,-BigInt("0x8000000000000000"),BigInt("0x7fffffffffffffff"))})),c.prototype.writeFloatLE=function(e,t,r){return B(this,e,t,!0,r)},c.prototype.writeFloatBE=function(e,t,r){return B(this,e,t,!1,r)},c.prototype.writeDoubleLE=function(e,t,r){return M(this,e,t,!0,r)},c.prototype.writeDoubleBE=function(e,t,r){return M(this,e,t,!1,r)},c.prototype.copy=function(e,t,r,n){if(!c.isBuffer(e))throw new TypeError("argument should be a Buffer");if(r||(r=0),n||0===n||(n=this.length),t>=e.length&&(t=e.length),t||(t=0),n>0&&n<r&&(n=r),n===r)return 0;if(0===e.length||0===this.length)return 0;if(t<0)throw new RangeError("targetStart out of bounds");if(r<0||r>=this.length)throw new RangeError("Index out of range");if(n<0)throw new RangeError("sourceEnd out of bounds");n>this.length&&(n=this.length),e.length-t<n-r&&(n=e.length-t+r);const s=n-r;return this===e&&"function"==typeof Uint8Array.prototype.copyWithin?this.copyWithin(t,r,n):Uint8Array.prototype.set.call(e,this.subarray(r,n),t),s},c.prototype.fill=function(e,t,r,n){if("string"==typeof e){if("string"==typeof t?(n=t,t=0,r=this.length):"string"==typeof r&&(n=r,r=this.length),void 0!==n&&"string"!=typeof n)throw new TypeError("encoding must be a string");if("string"==typeof n&&!c.isEncoding(n))throw new TypeError("Unknown encoding: "+n);if(1===e.length){const t=e.charCodeAt(0);("utf8"===n&&t<128||"latin1"===n)&&(e=t)}}else"number"==typeof e?e&=255:"boolean"==typeof e&&(e=Number(e));if(t<0||this.length<t||this.length<r)throw new RangeError("Out of range index");if(r<=t)return this;let s;if(t>>>=0,r=void 0===r?this.length:r>>>0,e||(e=0),"number"==typeof e)for(s=t;s<r;++s)this[s]=e;else{const i=c.isBuffer(e)?e:c.from(e,n),o=i.length;if(0===o)throw new TypeError('The value "'+e+'" is invalid for argument "value"');for(s=0;s<r-t;++s)this[s+t]=i[s%o]}return this};const U={};function H(e,t,r){U[e]=class extends r{constructor(){super(),Object.defineProperty(this,"message",{value:t.apply(this,arguments),writable:!0,configurable:!0}),this.name=`${this.name} [${e}]`,this.stack,delete this.name}get code(){return e}set code(e){Object.defineProperty(this,"code",{configurable:!0,enumerable:!0,value:e,writable:!0})}toString(){return`${this.name} [${e}]: ${this.message}`}}}function j(e){let t="",r=e.length;const n="-"===e[0]?1:0;for(;r>=n+4;r-=3)t=`_${e.slice(r-3,r)}${t}`;return`${e.slice(0,r)}${t}`}function z(e,t,r,n,s,i){if(e>r||e<t){const n="bigint"==typeof t?"n":"";let s;throw s=i>3?0===t||t===BigInt(0)?`>= 0${n} and < 2${n} ** ${8*(i+1)}${n}`:`>= -(2${n} ** ${8*(i+1)-1}${n}) and < 2 ** ${8*(i+1)-1}${n}`:`>= ${t}${n} and <= ${r}${n}`,new U.ERR_OUT_OF_RANGE("value",s,e)}!function(e,t,r){W(t,"offset"),void 0!==e[t]&&void 0!==e[t+r]||G(t,e.length-(r+1))}(n,s,i)}function W(e,t){if("number"!=typeof e)throw new U.ERR_INVALID_ARG_TYPE(t,"number",e)}function G(e,t,r){if(Math.floor(e)!==e)throw W(e,r),new U.ERR_OUT_OF_RANGE(r||"offset","an integer",e);if(t<0)throw new U.ERR_BUFFER_OUT_OF_BOUNDS;throw new U.ERR_OUT_OF_RANGE(r||"offset",`>= ${r?1:0} and <= ${t}`,e)}H("ERR_BUFFER_OUT_OF_BOUNDS",(function(e){return e?`${e} is outside of buffer bounds`:"Attempt to access memory outside buffer bounds"}),RangeError),H("ERR_INVALID_ARG_TYPE",(function(e,t){return`The "${e}" argument must be of type number. Received type ${typeof t}`}),TypeError),H("ERR_OUT_OF_RANGE",(function(e,t,r){let n=`The value of "${e}" is out of range.`,s=r;return Number.isInteger(r)&&Math.abs(r)>2**32?s=j(String(r)):"bigint"==typeof r&&(s=String(r),(r>BigInt(2)**BigInt(32)||r<-(BigInt(2)**BigInt(32)))&&(s=j(s)),s+="n"),n+=` It must be ${t}. Received ${s}`,n}),RangeError);const K=/[^+/0-9A-Za-z-_]/g;function V(e,t){let r;t=t||1/0;const n=e.length;let s=null;const i=[];for(let o=0;o<n;++o){if(r=e.charCodeAt(o),r>55295&&r<57344){if(!s){if(r>56319){(t-=3)>-1&&i.push(239,191,189);continue}if(o+1===n){(t-=3)>-1&&i.push(239,191,189);continue}s=r;continue}if(r<56320){(t-=3)>-1&&i.push(239,191,189),s=r;continue}r=65536+(s-55296<<10|r-56320)}else s&&(t-=3)>-1&&i.push(239,191,189);if(s=null,r<128){if((t-=1)<0)break;i.push(r)}else if(r<2048){if((t-=2)<0)break;i.push(r>>6|192,63&r|128)}else if(r<65536){if((t-=3)<0)break;i.push(r>>12|224,r>>6&63|128,63&r|128)}else{if(!(r<1114112))throw new Error("Invalid code point");if((t-=4)<0)break;i.push(r>>18|240,r>>12&63|128,r>>6&63|128,63&r|128)}}return i}function X(e){return n.toByteArray(function(e){if((e=(e=e.split("=")[0]).trim().replace(K,"")).length<2)return"";for(;e.length%4!=0;)e+="=";return e}(e))}function $(e,t,r,n){let s;for(s=0;s<n&&!(s+r>=t.length||s>=e.length);++s)t[s+r]=e[s];return s}function q(e,t){return e instanceof t||null!=e&&null!=e.constructor&&null!=e.constructor.name&&e.constructor.name===t.name}function Z(e){return e!=e}const Y=function(){const e="0123456789abcdef",t=new Array(256);for(let r=0;r<16;++r){const n=16*r;for(let s=0;s<16;++s)t[n+s]=e[r]+e[s]}return t}();function J(e){return"undefined"==typeof BigInt?Q:e}function Q(){throw new Error("BigInt not supported")}},7187:e=>{"use strict";var t,r="object"==typeof Reflect?Reflect:null,n=r&&"function"==typeof r.apply?r.apply:function(e,t,r){return Function.prototype.apply.call(e,t,r)};t=r&&"function"==typeof r.ownKeys?r.ownKeys:Object.getOwnPropertySymbols?function(e){return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e))}:function(e){return Object.getOwnPropertyNames(e)};var s=Number.isNaN||function(e){return e!=e};function i(){i.init.call(this)}e.exports=i,e.exports.once=function(e,t){return new Promise((function(r,n){function s(r){e.removeListener(t,i),n(r)}function i(){"function"==typeof e.removeListener&&e.removeListener("error",s),r([].slice.call(arguments))}m(e,t,i,{once:!0}),"error"!==t&&function(e,t,r){"function"==typeof e.on&&m(e,"error",t,{once:!0})}(e,s)}))},i.EventEmitter=i,i.prototype._events=void 0,i.prototype._eventsCount=0,i.prototype._maxListeners=void 0;var o=10;function a(e){if("function"!=typeof e)throw new TypeError('The "listener" argument must be of type Function. Received type '+typeof e)}function c(e){return void 0===e._maxListeners?i.defaultMaxListeners:e._maxListeners}function u(e,t,r,n){var s,i,o,u;if(a(r),void 0===(i=e._events)?(i=e._events=Object.create(null),e._eventsCount=0):(void 0!==i.newListener&&(e.emit("newListener",t,r.listener?r.listener:r),i=e._events),o=i[t]),void 0===o)o=i[t]=r,++e._eventsCount;else if("function"==typeof o?o=i[t]=n?[r,o]:[o,r]:n?o.unshift(r):o.push(r),(s=c(e))>0&&o.length>s&&!o.warned){o.warned=!0;var l=new Error("Possible EventEmitter memory leak detected. "+o.length+" "+String(t)+" listeners added. Use emitter.setMaxListeners() to increase limit");l.name="MaxListenersExceededWarning",l.emitter=e,l.type=t,l.count=o.length,u=l,console&&console.warn&&console.warn(u)}return e}function l(){if(!this.fired)return this.target.removeListener(this.type,this.wrapFn),this.fired=!0,0===arguments.length?this.listener.call(this.target):this.listener.apply(this.target,arguments)}function h(e,t,r){var n={fired:!1,wrapFn:void 0,target:e,type:t,listener:r},s=l.bind(n);return s.listener=r,n.wrapFn=s,s}function p(e,t,r){var n=e._events;if(void 0===n)return[];var s=n[t];return void 0===s?[]:"function"==typeof s?r?[s.listener||s]:[s]:r?function(e){for(var t=new Array(e.length),r=0;r<t.length;++r)t[r]=e[r].listener||e[r];return t}(s):f(s,s.length)}function d(e){var t=this._events;if(void 0!==t){var r=t[e];if("function"==typeof r)return 1;if(void 0!==r)return r.length}return 0}function f(e,t){for(var r=new Array(t),n=0;n<t;++n)r[n]=e[n];return r}function m(e,t,r,n){if("function"==typeof e.on)n.once?e.once(t,r):e.on(t,r);else{if("function"!=typeof e.addEventListener)throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type '+typeof e);e.addEventListener(t,(function s(i){n.once&&e.removeEventListener(t,s),r(i)}))}}Object.defineProperty(i,"defaultMaxListeners",{enumerable:!0,get:function(){return o},set:function(e){if("number"!=typeof e||e<0||s(e))throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received '+e+".");o=e}}),i.init=function(){void 0!==this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events=Object.create(null),this._eventsCount=0),this._maxListeners=this._maxListeners||void 0},i.prototype.setMaxListeners=function(e){if("number"!=typeof e||e<0||s(e))throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received '+e+".");return this._maxListeners=e,this},i.prototype.getMaxListeners=function(){return c(this)},i.prototype.emit=function(e){for(var t=[],r=1;r<arguments.length;r++)t.push(arguments[r]);var s="error"===e,i=this._events;if(void 0!==i)s=s&&void 0===i.error;else if(!s)return!1;if(s){var o;if(t.length>0&&(o=t[0]),o instanceof Error)throw o;var a=new Error("Unhandled error."+(o?" ("+o.message+")":""));throw a.context=o,a}var c=i[e];if(void 0===c)return!1;if("function"==typeof c)n(c,this,t);else{var u=c.length,l=f(c,u);for(r=0;r<u;++r)n(l[r],this,t)}return!0},i.prototype.addListener=function(e,t){return u(this,e,t,!1)},i.prototype.on=i.prototype.addListener,i.prototype.prependListener=function(e,t){return u(this,e,t,!0)},i.prototype.once=function(e,t){return a(t),this.on(e,h(this,e,t)),this},i.prototype.prependOnceListener=function(e,t){return a(t),this.prependListener(e,h(this,e,t)),this},i.prototype.removeListener=function(e,t){var r,n,s,i,o;if(a(t),void 0===(n=this._events))return this;if(void 0===(r=n[e]))return this;if(r===t||r.listener===t)0==--this._eventsCount?this._events=Object.create(null):(delete n[e],n.removeListener&&this.emit("removeListener",e,r.listener||t));else if("function"!=typeof r){for(s=-1,i=r.length-1;i>=0;i--)if(r[i]===t||r[i].listener===t){o=r[i].listener,s=i;break}if(s<0)return this;0===s?r.shift():function(e,t){for(;t+1<e.length;t++)e[t]=e[t+1];e.pop()}(r,s),1===r.length&&(n[e]=r[0]),void 0!==n.removeListener&&this.emit("removeListener",e,o||t)}return this},i.prototype.off=i.prototype.removeListener,i.prototype.removeAllListeners=function(e){var t,r,n;if(void 0===(r=this._events))return this;if(void 0===r.removeListener)return 0===arguments.length?(this._events=Object.create(null),this._eventsCount=0):void 0!==r[e]&&(0==--this._eventsCount?this._events=Object.create(null):delete r[e]),this;if(0===arguments.length){var s,i=Object.keys(r);for(n=0;n<i.length;++n)"removeListener"!==(s=i[n])&&this.removeAllListeners(s);return this.removeAllListeners("removeListener"),this._events=Object.create(null),this._eventsCount=0,this}if("function"==typeof(t=r[e]))this.removeListener(e,t);else if(void 0!==t)for(n=t.length-1;n>=0;n--)this.removeListener(e,t[n]);return this},i.prototype.listeners=function(e){return p(this,e,!0)},i.prototype.rawListeners=function(e){return p(this,e,!1)},i.listenerCount=function(e,t){return"function"==typeof e.listenerCount?e.listenerCount(t):d.call(e,t)},i.prototype.listenerCount=d,i.prototype.eventNames=function(){return this._eventsCount>0?t(this._events):[]}},645:(e,t)=>{t.read=function(e,t,r,n,s){var i,o,a=8*s-n-1,c=(1<<a)-1,u=c>>1,l=-7,h=r?s-1:0,p=r?-1:1,d=e[t+h];for(h+=p,i=d&(1<<-l)-1,d>>=-l,l+=a;l>0;i=256*i+e[t+h],h+=p,l-=8);for(o=i&(1<<-l)-1,i>>=-l,l+=n;l>0;o=256*o+e[t+h],h+=p,l-=8);if(0===i)i=1-u;else{if(i===c)return o?NaN:1/0*(d?-1:1);o+=Math.pow(2,n),i-=u}return(d?-1:1)*o*Math.pow(2,i-n)},t.write=function(e,t,r,n,s,i){var o,a,c,u=8*i-s-1,l=(1<<u)-1,h=l>>1,p=23===s?Math.pow(2,-24)-Math.pow(2,-77):0,d=n?0:i-1,f=n?1:-1,m=t<0||0===t&&1/t<0?1:0;for(t=Math.abs(t),isNaN(t)||t===1/0?(a=isNaN(t)?1:0,o=l):(o=Math.floor(Math.log(t)/Math.LN2),t*(c=Math.pow(2,-o))<1&&(o--,c*=2),(t+=o+h>=1?p/c:p*Math.pow(2,1-h))*c>=2&&(o++,c/=2),o+h>=l?(a=0,o=l):o+h>=1?(a=(t*c-1)*Math.pow(2,s),o+=h):(a=t*Math.pow(2,h-1)*Math.pow(2,s),o=0));s>=8;e[r+d]=255&a,d+=f,a/=256,s-=8);for(o=o<<s|a,u+=s;u>0;e[r+d]=255&o,d+=f,o/=256,u-=8);e[r+d-f]|=128*m}},5705:(e,t,r)=>{"use strict";var n,s,i=r.g.MutationObserver||r.g.WebKitMutationObserver;if(i){var o=0,a=new i(h),c=r.g.document.createTextNode("");a.observe(c,{characterData:!0}),n=function(){c.data=o=++o%2}}else if(r.g.setImmediate||void 0===r.g.MessageChannel)n="document"in r.g&&"onreadystatechange"in r.g.document.createElement("script")?function(){var e=r.g.document.createElement("script");e.onreadystatechange=function(){h(),e.onreadystatechange=null,e.parentNode.removeChild(e),e=null},r.g.document.documentElement.appendChild(e)}:function(){setTimeout(h,0)};else{var u=new r.g.MessageChannel;u.port1.onmessage=h,n=function(){u.port2.postMessage(0)}}var l=[];function h(){var e,t;s=!0;for(var r=l.length;r;){for(t=l,l=[],e=-1;++e<r;)t[e]();r=l.length}s=!1}e.exports=function(e){1!==l.push(e)||s||n()}},5717:e=>{"function"==typeof Object.create?e.exports=function(e,t){t&&(e.super_=t,e.prototype=Object.create(t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}))}:e.exports=function(e,t){if(t){e.super_=t;var r=function(){};r.prototype=t.prototype,e.prototype=new r,e.prototype.constructor=e}}},8458:(e,t,r)=>{"use strict";var n=r(8910),s=r(3790),i="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";t.encode=function(e){for(var t,r,s,o,a,c,u,l=[],h=0,p=e.length,d=p,f="string"!==n.getTypeOf(e);h<e.length;)d=p-h,f?(t=e[h++],r=h<p?e[h++]:0,s=h<p?e[h++]:0):(t=e.charCodeAt(h++),r=h<p?e.charCodeAt(h++):0,s=h<p?e.charCodeAt(h++):0),o=t>>2,a=(3&t)<<4|r>>4,c=d>1?(15&r)<<2|s>>6:64,u=d>2?63&s:64,l.push(i.charAt(o)+i.charAt(a)+i.charAt(c)+i.charAt(u));return l.join("")},t.decode=function(e){var t,r,n,o,a,c,u=0,l=0,h="data:";if(e.substr(0,h.length)===h)throw new Error("Invalid base64 input, it looks like a data url.");var p,d=3*(e=e.replace(/[^A-Za-z0-9+/=]/g,"")).length/4;if(e.charAt(e.length-1)===i.charAt(64)&&d--,e.charAt(e.length-2)===i.charAt(64)&&d--,d%1!=0)throw new Error("Invalid base64 input, bad content length.");for(p=s.uint8array?new Uint8Array(0|d):new Array(0|d);u<e.length;)t=i.indexOf(e.charAt(u++))<<2|(o=i.indexOf(e.charAt(u++)))>>4,r=(15&o)<<4|(a=i.indexOf(e.charAt(u++)))>>2,n=(3&a)<<6|(c=i.indexOf(e.charAt(u++))),p[l++]=t,64!==a&&(p[l++]=r),64!==c&&(p[l++]=n);return p}},7326:(e,t,r)=>{"use strict";var n=r(8565),s=r(5301),i=r(2541),o=r(5977);function a(e,t,r,n,s){this.compressedSize=e,this.uncompressedSize=t,this.crc32=r,this.compression=n,this.compressedContent=s}a.prototype={getContentWorker:function(){var e=new s(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new o("data_length")),t=this;return e.on("end",(function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")})),e},getCompressedWorker:function(){return new s(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},a.createWorkerFrom=function(e,t,r){return e.pipe(new i).pipe(new o("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new o("compressedSize")).withStreamInfo("compression",t)},e.exports=a},1678:(e,t,r)=>{"use strict";var n=r(3718);t.STORE={magic:"\0\0",compressWorker:function(){return new n("STORE compression")},uncompressWorker:function(){return new n("STORE decompression")}},t.DEFLATE=r(1033)},6988:(e,t,r)=>{"use strict";var n=r(8910),s=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();e.exports=function(e,t){return void 0!==e&&e.length?"string"!==n.getTypeOf(e)?function(e,t,r,n){var i=s,o=0+r;e^=-1;for(var a=0;a<o;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}(0|t,e,e.length):function(e,t,r,n){var i=s,o=0+r;e^=-1;for(var a=0;a<o;a++)e=e>>>8^i[255&(e^t.charCodeAt(a))];return-1^e}(0|t,e,e.length):0}},6032:(e,t)=>{"use strict";t.base64=!1,t.binary=!1,t.dir=!1,t.createFolders=!0,t.date=null,t.compression=null,t.compressionOptions=null,t.comment=null,t.unixPermissions=null,t.dosPermissions=null},8565:(e,t,r)=>{"use strict";var n;n="undefined"!=typeof Promise?Promise:r(3389),e.exports={Promise:n}},1033:(e,t,r)=>{"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,s=r(9591),i=r(8910),o=r(3718),a=n?"uint8array":"array";function c(e,t){o.call(this,"FlateWorker/"+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={}}t.magic="\b\0",i.inherits(c,o),c.prototype.processChunk=function(e){this.meta=e.meta,null===this._pako&&this._createPako(),this._pako.push(i.transformTo(a,e.data),!1)},c.prototype.flush=function(){o.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},c.prototype.cleanUp=function(){o.prototype.cleanUp.call(this),this._pako=null},c.prototype._createPako=function(){this._pako=new s[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var e=this;this._pako.onData=function(t){e.push({data:t,meta:e.meta})}},t.compressWorker=function(e){return new c("Deflate",e)},t.uncompressWorker=function(){return new c("Inflate",{})}},4979:(e,t,r)=>{"use strict";var n=r(8910),s=r(3718),i=r(3600),o=r(6988),a=r(1141),c=function(e,t){var r,n="";for(r=0;r<t;r++)n+=String.fromCharCode(255&e),e>>>=8;return n},u=function(e,t,r,s,u,l){var h,p,d=e.file,f=e.compression,m=l!==i.utf8encode,w=n.transformTo("string",l(d.name)),g=n.transformTo("string",i.utf8encode(d.name)),y=d.comment,b=n.transformTo("string",l(y)),v=n.transformTo("string",i.utf8encode(y)),x=g.length!==d.name.length,_=v.length!==y.length,E="",T="",A="",S=d.dir,I=d.date,N={crc32:0,compressedSize:0,uncompressedSize:0};t&&!r||(N.crc32=e.crc32,N.compressedSize=e.compressedSize,N.uncompressedSize=e.uncompressedSize);var R=0;t&&(R|=8),m||!x&&!_||(R|=2048);var k,C,O=0,L=0;S&&(O|=16),"UNIX"===u?(L=798,O|=(C=k=d.unixPermissions,k||(C=S?16893:33204),(65535&C)<<16)):(L=20,O|=63&(d.dosPermissions||0)),h=I.getUTCHours(),h<<=6,h|=I.getUTCMinutes(),h<<=5,h|=I.getUTCSeconds()/2,p=I.getUTCFullYear()-1980,p<<=4,p|=I.getUTCMonth()+1,p<<=5,p|=I.getUTCDate(),x&&(T=c(1,1)+c(o(w),4)+g,E+="up"+c(T.length,2)+T),_&&(A=c(1,1)+c(o(b),4)+v,E+="uc"+c(A.length,2)+A);var D="";return D+="\n\0",D+=c(R,2),D+=f.magic,D+=c(h,2),D+=c(p,2),D+=c(N.crc32,4),D+=c(N.compressedSize,4),D+=c(N.uncompressedSize,4),D+=c(w.length,2),D+=c(E.length,2),{fileRecord:a.LOCAL_FILE_HEADER+D+w+E,dirRecord:a.CENTRAL_FILE_HEADER+c(L,2)+D+c(b.length,2)+"\0\0\0\0"+c(O,4)+c(s,4)+w+E+b}},l=function(e){return a.DATA_DESCRIPTOR+c(e.crc32,4)+c(e.compressedSize,4)+c(e.uncompressedSize,4)};function h(e,t,r,n){s.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=r,this.encodeFileName=n,this.streamFiles=e,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}n.inherits(h,s),h.prototype.push=function(e){var t=e.meta.percent||0,r=this.entriesCount,n=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,s.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:r?(t+100*(r-n-1))/r:100}}))},h.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var r=u(e,t,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=!0},h.prototype.closedSource=function(e){this.accumulate=!1;var t=this.streamFiles&&!e.file.dir,r=u(e,t,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),t)this.push({data:l(e),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},h.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var r=this.bytesWritten-e,s=function(e,t,r,s,i){var o=n.transformTo("string",i(s));return a.CENTRAL_DIRECTORY_END+"\0\0\0\0"+c(e,2)+c(e,2)+c(t,4)+c(r,4)+c(o.length,2)+o}(this.dirRecords.length,r,e,this.zipComment,this.encodeFileName);this.push({data:s,meta:{percent:100}})},h.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},h.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on("data",(function(e){t.processChunk(e)})),e.on("end",(function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end()})),e.on("error",(function(e){t.error(e)})),this},h.prototype.resume=function(){return!!s.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},h.prototype.error=function(e){var t=this._sources;if(!s.prototype.error.call(this,e))return!1;for(var r=0;r<t.length;r++)try{t[r].error(e)}catch(e){}return!0},h.prototype.lock=function(){s.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock()},e.exports=h},7834:(e,t,r)=>{"use strict";var n=r(1678),s=r(4979);t.generateWorker=function(e,t,r){var i=new s(t.streamFiles,r,t.platform,t.encodeFileName),o=0;try{e.forEach((function(e,r){o++;var s=function(e,t){var r=e||t,s=n[r];if(!s)throw new Error(r+" is not a valid compression method !");return s}(r.options.compression,t.compression),a=r.options.compressionOptions||t.compressionOptions||{},c=r.dir,u=r.date;r._compressWorker(s,a).withStreamInfo("file",{name:e,dir:c,date:u,comment:r.comment||"",unixPermissions:r.unixPermissions,dosPermissions:r.dosPermissions}).pipe(i)})),i.entriesCount=o}catch(e){i.error(e)}return i}},6085:(e,t,r)=>{"use strict";function n(){if(!(this instanceof n))return new n;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var e=new n;for(var t in this)"function"!=typeof this[t]&&(e[t]=this[t]);return e}}n.prototype=r(7132),n.prototype.loadAsync=r(1062),n.support=r(3790),n.defaults=r(6032),n.version="3.10.1",n.loadAsync=function(e,t){return(new n).loadAsync(e,t)},n.external=r(8565),e.exports=n},1062:(e,t,r)=>{"use strict";var n=r(8910),s=r(8565),i=r(3600),o=r(6624),a=r(2541),c=r(2182);function u(e){return new s.Promise((function(t,r){var n=e.decompressed.getContentWorker().pipe(new a);n.on("error",(function(e){r(e)})).on("end",(function(){n.streamInfo.crc32!==e.decompressed.crc32?r(new Error("Corrupted zip : CRC32 mismatch")):t()})).resume()}))}e.exports=function(e,t){var r=this;return t=n.extend(t||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:i.utf8decode}),c.isNode&&c.isStream(e)?s.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):n.prepareContent("the loaded zip file",e,!0,t.optimizedBinaryString,t.base64).then((function(e){var r=new o(t);return r.load(e),r})).then((function(e){var r=[s.Promise.resolve(e)],n=e.files;if(t.checkCRC32)for(var i=0;i<n.length;i++)r.push(u(n[i]));return s.Promise.all(r)})).then((function(e){for(var s=e.shift(),i=s.files,o=0;o<i.length;o++){var a=i[o],c=a.fileNameStr,u=n.resolve(a.fileNameStr);r.file(u,a.decompressed,{binary:!0,optimizedBinaryString:!0,date:a.date,dir:a.dir,comment:a.fileCommentStr.length?a.fileCommentStr:null,unixPermissions:a.unixPermissions,dosPermissions:a.dosPermissions,createFolders:t.createFolders}),a.dir||(r.file(u).unsafeOriginalName=c)}return s.zipComment.length&&(r.comment=s.zipComment),r}))}},2182:e=>{"use strict";e.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if("number"==typeof e)throw new Error('The "data" argument must not be a number');return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&"function"==typeof e.on&&"function"==typeof e.pause&&"function"==typeof e.resume}}},660:(e,t,r)=>{"use strict";var n=r(8910),s=r(3718);function i(e,t){s.call(this,"Nodejs stream input adapter for "+e),this._upstreamEnded=!1,this._bindStream(t)}n.inherits(i,s),i.prototype._bindStream=function(e){var t=this;this._stream=e,e.pause(),e.on("data",(function(e){t.push({data:e,meta:{percent:0}})})).on("error",(function(e){t.isPaused?this.generatedError=e:t.error(e)})).on("end",(function(){t.isPaused?t._upstreamEnded=!0:t.end()}))},i.prototype.pause=function(){return!!s.prototype.pause.call(this)&&(this._stream.pause(),!0)},i.prototype.resume=function(){return!!s.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},e.exports=i},1220:(e,t,r)=>{"use strict";var n=r(749).Readable;function s(e,t,r){n.call(this,t),this._helper=e;var s=this;e.on("data",(function(e,t){s.push(e)||s._helper.pause(),r&&r(t)})).on("error",(function(e){s.emit("error",e)})).on("end",(function(){s.push(null)}))}r(8910).inherits(s,n),s.prototype._read=function(){this._helper.resume()},e.exports=s},7132:(e,t,r)=>{"use strict";var n=r(3600),s=r(8910),i=r(3718),o=r(1285),a=r(6032),c=r(7326),u=r(6859),l=r(7834),h=r(2182),p=r(660),d=function(e,t,r){var n,o=s.getTypeOf(t),l=s.extend(r||{},a);l.date=l.date||new Date,null!==l.compression&&(l.compression=l.compression.toUpperCase()),"string"==typeof l.unixPermissions&&(l.unixPermissions=parseInt(l.unixPermissions,8)),l.unixPermissions&&16384&l.unixPermissions&&(l.dir=!0),l.dosPermissions&&16&l.dosPermissions&&(l.dir=!0),l.dir&&(e=m(e)),l.createFolders&&(n=f(e))&&w.call(this,n,!0);var d="string"===o&&!1===l.binary&&!1===l.base64;r&&void 0!==r.binary||(l.binary=!d),(t instanceof c&&0===t.uncompressedSize||l.dir||!t||0===t.length)&&(l.base64=!1,l.binary=!0,t="",l.compression="STORE",o="string");var g;g=t instanceof c||t instanceof i?t:h.isNode&&h.isStream(t)?new p(e,t):s.prepareContent(e,t,l.binary,l.optimizedBinaryString,l.base64);var y=new u(e,g,l);this.files[e]=y},f=function(e){"/"===e.slice(-1)&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf("/");return t>0?e.substring(0,t):""},m=function(e){return"/"!==e.slice(-1)&&(e+="/"),e},w=function(e,t){return t=void 0!==t?t:a.createFolders,e=m(e),this.files[e]||d.call(this,e,null,{dir:!0,createFolders:t}),this.files[e]};function g(e){return"[object RegExp]"===Object.prototype.toString.call(e)}var y={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(e){var t,r,n;for(t in this.files)n=this.files[t],(r=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(r,n)},filter:function(e){var t=[];return this.forEach((function(r,n){e(r,n)&&t.push(n)})),t},file:function(e,t,r){if(1===arguments.length){if(g(e)){var n=e;return this.filter((function(e,t){return!t.dir&&n.test(e)}))}var s=this.files[this.root+e];return s&&!s.dir?s:null}return e=this.root+e,d.call(this,e,t,r),this},folder:function(e){if(!e)return this;if(g(e))return this.filter((function(t,r){return r.dir&&e.test(t)}));var t=this.root+e,r=w.call(this,t),n=this.clone();return n.root=r.name,n},remove:function(e){e=this.root+e;var t=this.files[e];if(t||("/"!==e.slice(-1)&&(e+="/"),t=this.files[e]),t&&!t.dir)delete this.files[e];else for(var r=this.filter((function(t,r){return r.name.slice(0,e.length)===e})),n=0;n<r.length;n++)delete this.files[r[n].name];return this},generate:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(e){var t,r={};try{if((r=s.extend(e||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:n.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");s.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var a=r.comment||this.comment||"";t=l.generateWorker(this,r,a)}catch(e){(t=new i("error")).error(e)}return new o(t,r.type||"string",r.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return(e=e||{}).type||(e.type="nodebuffer"),this.generateInternalStream(e).toNodejsStream(t)}};e.exports=y},749:(e,t,r)=>{"use strict";e.exports=r(2830)},2370:(e,t,r)=>{"use strict";var n=r(8542);function s(e){n.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t]}r(8910).inherits(s,n),s.prototype.byteAt=function(e){return this.data[this.zero+e]},s.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),s=e.charCodeAt(3),i=this.length-4;i>=0;--i)if(this.data[i]===t&&this.data[i+1]===r&&this.data[i+2]===n&&this.data[i+3]===s)return i-this.zero;return-1},s.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),s=e.charCodeAt(3),i=this.readData(4);return t===i[0]&&r===i[1]&&n===i[2]&&s===i[3]},s.prototype.readData=function(e){if(this.checkOffset(e),0===e)return[];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},e.exports=s},8542:(e,t,r)=>{"use strict";var n=r(8910);function s(e){this.data=e,this.length=e.length,this.index=0,this.zero=0}s.prototype={checkOffset:function(e){this.checkIndex(this.index+e)},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+e+"). Corrupted zip ?")},setIndex:function(e){this.checkIndex(e),this.index=e},skip:function(e){this.setIndex(this.index+e)},byteAt:function(){},readInt:function(e){var t,r=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)r=(r<<8)+this.byteAt(t);return this.index+=e,r},readString:function(e){return n.transformTo("string",this.readData(e))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},e.exports=s},9583:(e,t,r)=>{"use strict";var n=r(414);function s(e){n.call(this,e)}r(8910).inherits(s,n),s.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},e.exports=s},9226:(e,t,r)=>{"use strict";var n=r(8542);function s(e){n.call(this,e)}r(8910).inherits(s,n),s.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},s.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},s.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},s.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},e.exports=s},414:(e,t,r)=>{"use strict";var n=r(2370);function s(e){n.call(this,e)}r(8910).inherits(s,n),s.prototype.readData=function(e){if(this.checkOffset(e),0===e)return new Uint8Array(0);var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},e.exports=s},8435:(e,t,r)=>{"use strict";var n=r(8910),s=r(3790),i=r(2370),o=r(9226),a=r(9583),c=r(414);e.exports=function(e){var t=n.getTypeOf(e);return n.checkSupport(t),"string"!==t||s.uint8array?"nodebuffer"===t?new a(e):s.uint8array?new c(n.transformTo("uint8array",e)):new i(n.transformTo("array",e)):new o(e)}},1141:(e,t)=>{"use strict";t.LOCAL_FILE_HEADER="PK",t.CENTRAL_FILE_HEADER="PK",t.CENTRAL_DIRECTORY_END="PK",t.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",t.ZIP64_CENTRAL_DIRECTORY_END="PK",t.DATA_DESCRIPTOR="PK\b"},4293:(e,t,r)=>{"use strict";var n=r(3718),s=r(8910);function i(e){n.call(this,"ConvertWorker to "+e),this.destType=e}s.inherits(i,n),i.prototype.processChunk=function(e){this.push({data:s.transformTo(this.destType,e.data),meta:e.meta})},e.exports=i},2541:(e,t,r)=>{"use strict";var n=r(3718),s=r(6988);function i(){n.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}r(8910).inherits(i,n),i.prototype.processChunk=function(e){this.streamInfo.crc32=s(e.data,this.streamInfo.crc32||0),this.push(e)},e.exports=i},5977:(e,t,r)=>{"use strict";var n=r(8910),s=r(3718);function i(e){s.call(this,"DataLengthProbe for "+e),this.propName=e,this.withStreamInfo(e,0)}n.inherits(i,s),i.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length}s.prototype.processChunk.call(this,e)},e.exports=i},5301:(e,t,r)=>{"use strict";var n=r(8910),s=r(3718);function i(e){s.call(this,"DataWorker");var t=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,e.then((function(e){t.dataIsReady=!0,t.data=e,t.max=e&&e.length||0,t.type=n.getTypeOf(e),t.isPaused||t._tickAndRepeat()}),(function(e){t.error(e)}))}n.inherits(i,s),i.prototype.cleanUp=function(){s.prototype.cleanUp.call(this),this.data=null},i.prototype.resume=function(){return!!s.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,n.delay(this._tickAndRepeat,[],this)),!0)},i.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(n.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},i.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":e=this.data.substring(this.index,t);break;case"uint8array":e=this.data.subarray(this.index,t);break;case"array":case"nodebuffer":e=this.data.slice(this.index,t)}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},e.exports=i},3718:e=>{"use strict";function t(e){this.name=e||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}t.prototype={push:function(e){this.emit("data",e)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(e){this.emit("error",e)}return!0},error:function(e){return!this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=!0,this.emit("error",e),this.previous&&this.previous.error(e),this.cleanUp()),!0)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(e,t){if(this._listeners[e])for(var r=0;r<this._listeners[e].length;r++)this._listeners[e][r].call(this,t)},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on("data",(function(e){t.processChunk(e)})),e.on("end",(function(){t.end()})),e.on("error",(function(e){t.error(e)})),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;this.isPaused=!1;var e=!1;return this.generatedError&&(this.error(this.generatedError),e=!0),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e)},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,e)&&(this.streamInfo[e]=this.extraStreamInfo[e])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var e="Worker "+this.name;return this.previous?this.previous+" -> "+e:e}},e.exports=t},1285:(e,t,r)=>{"use strict";var n=r(8910),s=r(4293),i=r(3718),o=r(8458),a=r(3790),c=r(8565),u=null;if(a.nodestream)try{u=r(1220)}catch(e){}function l(e,t,r){var o=t;switch(t){case"blob":case"arraybuffer":o="uint8array";break;case"base64":o="string"}try{this._internalType=o,this._outputType=t,this._mimeType=r,n.checkSupport(o),this._worker=e.pipe(new s(o)),e.lock()}catch(e){this._worker=new i("error"),this._worker.error(e)}}l.prototype={accumulate:function(e){return t=this,r=e,new c.Promise((function(e,s){var i=[],a=t._internalType,c=t._outputType,u=t._mimeType;t.on("data",(function(e,t){i.push(e),r&&r(t)})).on("error",(function(e){i=[],s(e)})).on("end",(function(){try{var t=function(e,t,r){switch(e){case"blob":return n.newBlob(n.transformTo("arraybuffer",t),r);case"base64":return o.encode(t);default:return n.transformTo(e,t)}}(c,function(e,t){var r,n=0,s=null,i=0;for(r=0;r<t.length;r++)i+=t[r].length;switch(e){case"string":return t.join("");case"array":return Array.prototype.concat.apply([],t);case"uint8array":for(s=new Uint8Array(i),r=0;r<t.length;r++)s.set(t[r],n),n+=t[r].length;return s;case"nodebuffer":return Buffer.concat(t);default:throw new Error("concat : unsupported type '"+e+"'")}}(a,i),u);e(t)}catch(e){s(e)}i=[]})).resume()}));var t,r},on:function(e,t){var r=this;return"data"===e?this._worker.on(e,(function(e){t.call(r,e.data,e.meta)})):this._worker.on(e,(function(){n.delay(t,arguments,r)})),this},resume:function(){return n.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(n.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new u(this,{objectMode:"nodebuffer"!==this._outputType},e)}},e.exports=l},3790:(e,t,r)=>{"use strict";if(t.base64=!0,t.array=!0,t.string=!0,t.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,t.nodebuffer="undefined"!=typeof Buffer,t.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)t.blob=!1;else{var n=new ArrayBuffer(0);try{t.blob=0===new Blob([n],{type:"application/zip"}).size}catch(e){try{var s=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);s.append(n),t.blob=0===s.getBlob("application/zip").size}catch(e){t.blob=!1}}}try{t.nodestream=!!r(749).Readable}catch(e){t.nodestream=!1}},3600:(e,t,r)=>{"use strict";for(var n=r(8910),s=r(3790),i=r(2182),o=r(3718),a=new Array(256),c=0;c<256;c++)a[c]=c>=252?6:c>=248?5:c>=240?4:c>=224?3:c>=192?2:1;function u(){o.call(this,"utf-8 decode"),this.leftOver=null}function l(){o.call(this,"utf-8 encode")}a[254]=a[254]=1,t.utf8encode=function(e){return s.nodebuffer?i.newBufferFrom(e,"utf-8"):function(e){var t,r,n,i,o,a=e.length,c=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),c+=r<128?1:r<2048?2:r<65536?3:4;for(t=s.uint8array?new Uint8Array(c):new Array(c),o=0,i=0;o<c;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[o++]=r:r<2048?(t[o++]=192|r>>>6,t[o++]=128|63&r):r<65536?(t[o++]=224|r>>>12,t[o++]=128|r>>>6&63,t[o++]=128|63&r):(t[o++]=240|r>>>18,t[o++]=128|r>>>12&63,t[o++]=128|r>>>6&63,t[o++]=128|63&r);return t}(e)},t.utf8decode=function(e){return s.nodebuffer?n.transformTo("nodebuffer",e).toString("utf-8"):function(e){var t,r,s,i,o=e.length,c=new Array(2*o);for(r=0,t=0;t<o;)if((s=e[t++])<128)c[r++]=s;else if((i=a[s])>4)c[r++]=65533,t+=i-1;else{for(s&=2===i?31:3===i?15:7;i>1&&t<o;)s=s<<6|63&e[t++],i--;i>1?c[r++]=65533:s<65536?c[r++]=s:(s-=65536,c[r++]=55296|s>>10&1023,c[r++]=56320|1023&s)}return c.length!==r&&(c.subarray?c=c.subarray(0,r):c.length=r),n.applyFromCharCode(c)}(e=n.transformTo(s.uint8array?"uint8array":"array",e))},n.inherits(u,o),u.prototype.processChunk=function(e){var r=n.transformTo(s.uint8array?"uint8array":"array",e.data);if(this.leftOver&&this.leftOver.length){if(s.uint8array){var i=r;(r=new Uint8Array(i.length+this.leftOver.length)).set(this.leftOver,0),r.set(i,this.leftOver.length)}else r=this.leftOver.concat(r);this.leftOver=null}var o=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;r>=0&&128==(192&e[r]);)r--;return r<0||0===r?t:r+a[e[r]]>t?r:t}(r),c=r;o!==r.length&&(s.uint8array?(c=r.subarray(0,o),this.leftOver=r.subarray(o,r.length)):(c=r.slice(0,o),this.leftOver=r.slice(o,r.length))),this.push({data:t.utf8decode(c),meta:e.meta})},u.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:t.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},t.Utf8DecodeWorker=u,n.inherits(l,o),l.prototype.processChunk=function(e){this.push({data:t.utf8encode(e.data),meta:e.meta})},t.Utf8EncodeWorker=l},8910:(e,t,r)=>{"use strict";var n=r(3790),s=r(8458),i=r(2182),o=r(8565);function a(e){return e}function c(e,t){for(var r=0;r<e.length;++r)t[r]=255&e.charCodeAt(r);return t}r(4889),t.newBlob=function(e,r){t.checkSupport("blob");try{return new Blob([e],{type:r})}catch(t){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return n.append(e),n.getBlob(r)}catch(e){throw new Error("Bug : can't construct the Blob.")}}};var u={stringifyByChunk:function(e,t,r){var n=[],s=0,i=e.length;if(i<=r)return String.fromCharCode.apply(null,e);for(;s<i;)"array"===t||"nodebuffer"===t?n.push(String.fromCharCode.apply(null,e.slice(s,Math.min(s+r,i)))):n.push(String.fromCharCode.apply(null,e.subarray(s,Math.min(s+r,i)))),s+=r;return n.join("")},stringifyByChar:function(e){for(var t="",r=0;r<e.length;r++)t+=String.fromCharCode(e[r]);return t},applyCanBeUsed:{uint8array:function(){try{return n.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(e){return!1}}(),nodebuffer:function(){try{return n.nodebuffer&&1===String.fromCharCode.apply(null,i.allocBuffer(1)).length}catch(e){return!1}}()}};function l(e){var r=65536,n=t.getTypeOf(e),s=!0;if("uint8array"===n?s=u.applyCanBeUsed.uint8array:"nodebuffer"===n&&(s=u.applyCanBeUsed.nodebuffer),s)for(;r>1;)try{return u.stringifyByChunk(e,n,r)}catch(e){r=Math.floor(r/2)}return u.stringifyByChar(e)}function h(e,t){for(var r=0;r<e.length;r++)t[r]=e[r];return t}t.applyFromCharCode=l;var p={};p.string={string:a,array:function(e){return c(e,new Array(e.length))},arraybuffer:function(e){return p.string.uint8array(e).buffer},uint8array:function(e){return c(e,new Uint8Array(e.length))},nodebuffer:function(e){return c(e,i.allocBuffer(e.length))}},p.array={string:l,array:a,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return i.newBufferFrom(e)}},p.arraybuffer={string:function(e){return l(new Uint8Array(e))},array:function(e){return h(new Uint8Array(e),new Array(e.byteLength))},arraybuffer:a,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return i.newBufferFrom(new Uint8Array(e))}},p.uint8array={string:l,array:function(e){return h(e,new Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:a,nodebuffer:function(e){return i.newBufferFrom(e)}},p.nodebuffer={string:l,array:function(e){return h(e,new Array(e.length))},arraybuffer:function(e){return p.nodebuffer.uint8array(e).buffer},uint8array:function(e){return h(e,new Uint8Array(e.length))},nodebuffer:a},t.transformTo=function(e,r){if(r||(r=""),!e)return r;t.checkSupport(e);var n=t.getTypeOf(r);return p[n][e](r)},t.resolve=function(e){for(var t=e.split("/"),r=[],n=0;n<t.length;n++){var s=t[n];"."===s||""===s&&0!==n&&n!==t.length-1||(".."===s?r.pop():r.push(s))}return r.join("/")},t.getTypeOf=function(e){return"string"==typeof e?"string":"[object Array]"===Object.prototype.toString.call(e)?"array":n.nodebuffer&&i.isBuffer(e)?"nodebuffer":n.uint8array&&e instanceof Uint8Array?"uint8array":n.arraybuffer&&e instanceof ArrayBuffer?"arraybuffer":void 0},t.checkSupport=function(e){if(!n[e.toLowerCase()])throw new Error(e+" is not supported by this platform")},t.MAX_VALUE_16BITS=65535,t.MAX_VALUE_32BITS=-1,t.pretty=function(e){var t,r,n="";for(r=0;r<(e||"").length;r++)n+="\\x"+((t=e.charCodeAt(r))<16?"0":"")+t.toString(16).toUpperCase();return n},t.delay=function(e,t,r){setImmediate((function(){e.apply(r||null,t||[])}))},t.inherits=function(e,t){var r=function(){};r.prototype=t.prototype,e.prototype=new r},t.extend=function(){var e,t,r={};for(e=0;e<arguments.length;e++)for(t in arguments[e])Object.prototype.hasOwnProperty.call(arguments[e],t)&&void 0===r[t]&&(r[t]=arguments[e][t]);return r},t.prepareContent=function(e,r,i,a,u){return o.Promise.resolve(r).then((function(e){return n.blob&&(e instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(e)))&&"undefined"!=typeof FileReader?new o.Promise((function(t,r){var n=new FileReader;n.onload=function(e){t(e.target.result)},n.onerror=function(e){r(e.target.error)},n.readAsArrayBuffer(e)})):e})).then((function(r){var l,h=t.getTypeOf(r);return h?("arraybuffer"===h?r=t.transformTo("uint8array",r):"string"===h&&(u?r=s.decode(r):i&&!0!==a&&(r=c(l=r,n.uint8array?new Uint8Array(l.length):new Array(l.length)))),r):o.Promise.reject(new Error("Can't read the data of '"+e+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))}))}},6624:(e,t,r)=>{"use strict";var n=r(8435),s=r(8910),i=r(1141),o=r(9392),a=r(3790);function c(e){this.files=[],this.loadOptions=e}c.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+s.pretty(t)+", expected "+s.pretty(e)+")")}},isSignature:function(e,t){var r=this.reader.index;this.reader.setIndex(e);var n=this.reader.readString(4)===t;return this.reader.setIndex(r),n},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=a.uint8array?"uint8array":"array",r=s.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,r,n=this.zip64EndOfCentralSize-44;0<n;)e=this.reader.readInt(2),t=this.reader.readInt(4),r=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:r}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),this.disksCount>1)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var e,t;for(e=0;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(i.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.handleUTF8(),t.processAttributes()},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(i.CENTRAL_FILE_HEADER);)(e=new o({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(i.CENTRAL_DIRECTORY_END);if(e<0)throw this.isSignature(0,i.LOCAL_FILE_HEADER)?new Error("Corrupted zip: can't find end of central directory"):new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");this.reader.setIndex(e);var t=e;if(this.checkSignature(i.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===s.MAX_VALUE_16BITS||this.diskWithCentralDirStart===s.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===s.MAX_VALUE_16BITS||this.centralDirRecords===s.MAX_VALUE_16BITS||this.centralDirSize===s.MAX_VALUE_32BITS||this.centralDirOffset===s.MAX_VALUE_32BITS){if(this.zip64=!0,(e=this.reader.lastIndexOfSignature(i.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(e),this.checkSignature(i.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,i.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(i.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(i.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var n=t-r;if(n>0)this.isSignature(t,i.CENTRAL_FILE_HEADER)||(this.reader.zero=n);else if(n<0)throw new Error("Corrupted zip: missing "+Math.abs(n)+" bytes.")},prepareReader:function(e){this.reader=n(e)},load:function(e){this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},e.exports=c},9392:(e,t,r)=>{"use strict";var n=r(8435),s=r(8910),i=r(7326),o=r(6988),a=r(3600),c=r(1678),u=r(3790);function l(e,t){this.options=e,this.loadOptions=t}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(e){var t,r;if(e.skip(22),this.fileNameLength=e.readInt(2),r=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(t=function(e){for(var t in c)if(Object.prototype.hasOwnProperty.call(c,t)&&c[t].magic===e)return c[t];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new i(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize))},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0===e&&(this.dosPermissions=63&this.externalFileAttributes),3===e&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(){if(this.extraFields[1]){var e=n(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4))}},readExtraFields:function(e){var t,r,n,s=e.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});e.index+4<s;)t=e.readInt(2),r=e.readInt(2),n=e.readData(r),this.extraFields[t]={id:t,length:r,value:n};e.setIndex(s)},handleUTF8:function(){var e=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=a.utf8decode(this.fileName),this.fileCommentStr=a.utf8decode(this.fileComment);else{var t=this.findExtraFieldUnicodePath();if(null!==t)this.fileNameStr=t;else{var r=s.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var n=this.findExtraFieldUnicodeComment();if(null!==n)this.fileCommentStr=n;else{var i=s.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(i)}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=n(e.value);return 1!==t.readInt(1)||o(this.fileName)!==t.readInt(4)?null:a.utf8decode(t.readData(e.length-5))}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=n(e.value);return 1!==t.readInt(1)||o(this.fileComment)!==t.readInt(4)?null:a.utf8decode(t.readData(e.length-5))}return null}},e.exports=l},6859:(e,t,r)=>{"use strict";var n=r(1285),s=r(5301),i=r(3600),o=r(7326),a=r(3718),c=function(e,t,r){this.name=e,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=t,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}};c.prototype={internalStream:function(e){var t=null,r="string";try{if(!e)throw new Error("No output type specified.");var s="string"===(r=e.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),t=this._decompressWorker();var o=!this._dataBinary;o&&!s&&(t=t.pipe(new i.Utf8EncodeWorker)),!o&&s&&(t=t.pipe(new i.Utf8DecodeWorker))}catch(e){(t=new a("error")).error(e)}return new n(t,r,"")},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||"nodebuffer").toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof o&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new i.Utf8EncodeWorker)),o.createWorkerFrom(r,e,t)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof a?this._data:new s(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},h=0;h<u.length;h++)c.prototype[u[h]]=l;e.exports=c},3389:(e,t,r)=>{"use strict";var n=r(5705);function s(){}var i={},o=["REJECTED"],a=["FULFILLED"],c=["PENDING"];function u(e){if("function"!=typeof e)throw new TypeError("resolver must be a function");this.state=c,this.queue=[],this.outcome=void 0,e!==s&&d(this,e)}function l(e,t,r){this.promise=e,"function"==typeof t&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function h(e,t,r){n((function(){var n;try{n=t(r)}catch(t){return i.reject(e,t)}n===e?i.reject(e,new TypeError("Cannot resolve promise with itself")):i.resolve(e,n)}))}function p(e){var t=e&&e.then;if(e&&("object"==typeof e||"function"==typeof e)&&"function"==typeof t)return function(){t.apply(e,arguments)}}function d(e,t){var r=!1;function n(t){r||(r=!0,i.reject(e,t))}function s(t){r||(r=!0,i.resolve(e,t))}var o=f((function(){t(s,n)}));"error"===o.status&&n(o.value)}function f(e,t){var r={};try{r.value=e(t),r.status="success"}catch(e){r.status="error",r.value=e}return r}e.exports=u,u.prototype.finally=function(e){if("function"!=typeof e)return this;var t=this.constructor;return this.then((function(r){return t.resolve(e()).then((function(){return r}))}),(function(r){return t.resolve(e()).then((function(){throw r}))}))},u.prototype.catch=function(e){return this.then(null,e)},u.prototype.then=function(e,t){if("function"!=typeof e&&this.state===a||"function"!=typeof t&&this.state===o)return this;var r=new this.constructor(s);return this.state!==c?h(r,this.state===a?e:t,this.outcome):this.queue.push(new l(r,e,t)),r},l.prototype.callFulfilled=function(e){i.resolve(this.promise,e)},l.prototype.otherCallFulfilled=function(e){h(this.promise,this.onFulfilled,e)},l.prototype.callRejected=function(e){i.reject(this.promise,e)},l.prototype.otherCallRejected=function(e){h(this.promise,this.onRejected,e)},i.resolve=function(e,t){var r=f(p,t);if("error"===r.status)return i.reject(e,r.value);var n=r.value;if(n)d(e,n);else{e.state=a,e.outcome=t;for(var s=-1,o=e.queue.length;++s<o;)e.queue[s].callFulfilled(t)}return e},i.reject=function(e,t){e.state=o,e.outcome=t;for(var r=-1,n=e.queue.length;++r<n;)e.queue[r].callRejected(t);return e},u.resolve=function(e){return e instanceof this?e:i.resolve(new this(s),e)},u.reject=function(e){var t=new this(s);return i.reject(t,e)},u.all=function(e){var t=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var r=e.length,n=!1;if(!r)return this.resolve([]);for(var o=new Array(r),a=0,c=-1,u=new this(s);++c<r;)l(e[c],c);return u;function l(e,s){t.resolve(e).then((function(e){o[s]=e,++a!==r||n||(n=!0,i.resolve(u,o))}),(function(e){n||(n=!0,i.reject(u,e))}))}},u.race=function(e){if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var t=e.length,r=!1;if(!t)return this.resolve([]);for(var n,o=-1,a=new this(s);++o<t;)n=e[o],this.resolve(n).then((function(e){r||(r=!0,i.resolve(a,e))}),(function(e){r||(r=!0,i.reject(a,e))}));return a}},9591:(e,t,r)=>{"use strict";var n={};(0,r(4236).assign)(n,r(4555),r(8843),r(1619)),e.exports=n},4555:(e,t,r)=>{"use strict";var n=r(405),s=r(4236),i=r(9373),o=r(8898),a=r(2292),c=Object.prototype.toString;function u(e){if(!(this instanceof u))return new u(e);this.options=s.assign({level:-1,method:8,chunkSize:16384,windowBits:15,memLevel:8,strategy:0,to:""},e||{});var t=this.options;t.raw&&t.windowBits>0?t.windowBits=-t.windowBits:t.gzip&&t.windowBits>0&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new a,this.strm.avail_out=0;var r=n.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(0!==r)throw new Error(o[r]);if(t.header&&n.deflateSetHeader(this.strm,t.header),t.dictionary){var l;if(l="string"==typeof t.dictionary?i.string2buf(t.dictionary):"[object ArrayBuffer]"===c.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,0!==(r=n.deflateSetDictionary(this.strm,l)))throw new Error(o[r]);this._dict_set=!0}}function l(e,t){var r=new u(t);if(r.push(e,!0),r.err)throw r.msg||o[r.err];return r.result}u.prototype.push=function(e,t){var r,o,a=this.strm,u=this.options.chunkSize;if(this.ended)return!1;o=t===~~t?t:!0===t?4:0,"string"==typeof e?a.input=i.string2buf(e):"[object ArrayBuffer]"===c.call(e)?a.input=new Uint8Array(e):a.input=e,a.next_in=0,a.avail_in=a.input.length;do{if(0===a.avail_out&&(a.output=new s.Buf8(u),a.next_out=0,a.avail_out=u),1!==(r=n.deflate(a,o))&&0!==r)return this.onEnd(r),this.ended=!0,!1;0!==a.avail_out&&(0!==a.avail_in||4!==o&&2!==o)||("string"===this.options.to?this.onData(i.buf2binstring(s.shrinkBuf(a.output,a.next_out))):this.onData(s.shrinkBuf(a.output,a.next_out)))}while((a.avail_in>0||0===a.avail_out)&&1!==r);return 4===o?(r=n.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,0===r):2!==o||(this.onEnd(0),a.avail_out=0,!0)},u.prototype.onData=function(e){this.chunks.push(e)},u.prototype.onEnd=function(e){0===e&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=s.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},t.Deflate=u,t.deflate=l,t.deflateRaw=function(e,t){return(t=t||{}).raw=!0,l(e,t)},t.gzip=function(e,t){return(t=t||{}).gzip=!0,l(e,t)}},8843:(e,t,r)=>{"use strict";var n=r(7948),s=r(4236),i=r(9373),o=r(1619),a=r(8898),c=r(2292),u=r(2401),l=Object.prototype.toString;function h(e){if(!(this instanceof h))return new h(e);this.options=s.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&t.windowBits>=0&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(t.windowBits>=0&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),t.windowBits>15&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new c,this.strm.avail_out=0;var r=n.inflateInit2(this.strm,t.windowBits);if(r!==o.Z_OK)throw new Error(a[r]);if(this.header=new u,n.inflateGetHeader(this.strm,this.header),t.dictionary&&("string"==typeof t.dictionary?t.dictionary=i.string2buf(t.dictionary):"[object ArrayBuffer]"===l.call(t.dictionary)&&(t.dictionary=new Uint8Array(t.dictionary)),t.raw&&(r=n.inflateSetDictionary(this.strm,t.dictionary))!==o.Z_OK))throw new Error(a[r])}function p(e,t){var r=new h(t);if(r.push(e,!0),r.err)throw r.msg||a[r.err];return r.result}h.prototype.push=function(e,t){var r,a,c,u,h,p=this.strm,d=this.options.chunkSize,f=this.options.dictionary,m=!1;if(this.ended)return!1;a=t===~~t?t:!0===t?o.Z_FINISH:o.Z_NO_FLUSH,"string"==typeof e?p.input=i.binstring2buf(e):"[object ArrayBuffer]"===l.call(e)?p.input=new Uint8Array(e):p.input=e,p.next_in=0,p.avail_in=p.input.length;do{if(0===p.avail_out&&(p.output=new s.Buf8(d),p.next_out=0,p.avail_out=d),(r=n.inflate(p,o.Z_NO_FLUSH))===o.Z_NEED_DICT&&f&&(r=n.inflateSetDictionary(this.strm,f)),r===o.Z_BUF_ERROR&&!0===m&&(r=o.Z_OK,m=!1),r!==o.Z_STREAM_END&&r!==o.Z_OK)return this.onEnd(r),this.ended=!0,!1;p.next_out&&(0!==p.avail_out&&r!==o.Z_STREAM_END&&(0!==p.avail_in||a!==o.Z_FINISH&&a!==o.Z_SYNC_FLUSH)||("string"===this.options.to?(c=i.utf8border(p.output,p.next_out),u=p.next_out-c,h=i.buf2string(p.output,c),p.next_out=u,p.avail_out=d-u,u&&s.arraySet(p.output,p.output,c,u,0),this.onData(h)):this.onData(s.shrinkBuf(p.output,p.next_out)))),0===p.avail_in&&0===p.avail_out&&(m=!0)}while((p.avail_in>0||0===p.avail_out)&&r!==o.Z_STREAM_END);return r===o.Z_STREAM_END&&(a=o.Z_FINISH),a===o.Z_FINISH?(r=n.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===o.Z_OK):a!==o.Z_SYNC_FLUSH||(this.onEnd(o.Z_OK),p.avail_out=0,!0)},h.prototype.onData=function(e){this.chunks.push(e)},h.prototype.onEnd=function(e){e===o.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=s.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},t.Inflate=h,t.inflate=p,t.inflateRaw=function(e,t){return(t=t||{}).raw=!0,p(e,t)},t.ungzip=p},4236:(e,t)=>{"use strict";var r="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;function n(e,t){return Object.prototype.hasOwnProperty.call(e,t)}t.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var r=t.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var s in r)n(r,s)&&(e[s]=r[s])}}return e},t.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var s={arraySet:function(e,t,r,n,s){if(t.subarray&&e.subarray)e.set(t.subarray(r,r+n),s);else for(var i=0;i<n;i++)e[s+i]=t[r+i]},flattenChunks:function(e){var t,r,n,s,i,o;for(n=0,t=0,r=e.length;t<r;t++)n+=e[t].length;for(o=new Uint8Array(n),s=0,t=0,r=e.length;t<r;t++)i=e[t],o.set(i,s),s+=i.length;return o}},i={arraySet:function(e,t,r,n,s){for(var i=0;i<n;i++)e[s+i]=t[r+i]},flattenChunks:function(e){return[].concat.apply([],e)}};t.setTyped=function(e){e?(t.Buf8=Uint8Array,t.Buf16=Uint16Array,t.Buf32=Int32Array,t.assign(t,s)):(t.Buf8=Array,t.Buf16=Array,t.Buf32=Array,t.assign(t,i))},t.setTyped(r)},9373:(e,t,r)=>{"use strict";var n=r(4236),s=!0,i=!0;try{String.fromCharCode.apply(null,[0])}catch(e){s=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){i=!1}for(var o=new n.Buf8(256),a=0;a<256;a++)o[a]=a>=252?6:a>=248?5:a>=240?4:a>=224?3:a>=192?2:1;function c(e,t){if(t<65534&&(e.subarray&&i||!e.subarray&&s))return String.fromCharCode.apply(null,n.shrinkBuf(e,t));for(var r="",o=0;o<t;o++)r+=String.fromCharCode(e[o]);return r}o[254]=o[254]=1,t.string2buf=function(e){var t,r,s,i,o,a=e.length,c=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(s=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(s-56320),i++),c+=r<128?1:r<2048?2:r<65536?3:4;for(t=new n.Buf8(c),o=0,i=0;o<c;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(s=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(s-56320),i++),r<128?t[o++]=r:r<2048?(t[o++]=192|r>>>6,t[o++]=128|63&r):r<65536?(t[o++]=224|r>>>12,t[o++]=128|r>>>6&63,t[o++]=128|63&r):(t[o++]=240|r>>>18,t[o++]=128|r>>>12&63,t[o++]=128|r>>>6&63,t[o++]=128|63&r);return t},t.buf2binstring=function(e){return c(e,e.length)},t.binstring2buf=function(e){for(var t=new n.Buf8(e.length),r=0,s=t.length;r<s;r++)t[r]=e.charCodeAt(r);return t},t.buf2string=function(e,t){var r,n,s,i,a=t||e.length,u=new Array(2*a);for(n=0,r=0;r<a;)if((s=e[r++])<128)u[n++]=s;else if((i=o[s])>4)u[n++]=65533,r+=i-1;else{for(s&=2===i?31:3===i?15:7;i>1&&r<a;)s=s<<6|63&e[r++],i--;i>1?u[n++]=65533:s<65536?u[n++]=s:(s-=65536,u[n++]=55296|s>>10&1023,u[n++]=56320|1023&s)}return c(u,n)},t.utf8border=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;r>=0&&128==(192&e[r]);)r--;return r<0||0===r?t:r+o[e[r]]>t?r:t}},6069:e=>{"use strict";e.exports=function(e,t,r,n){for(var s=65535&e|0,i=e>>>16&65535|0,o=0;0!==r;){r-=o=r>2e3?2e3:r;do{i=i+(s=s+t[n++]|0)|0}while(--o);s%=65521,i%=65521}return s|i<<16|0}},1619:e=>{"use strict";e.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},2869:e=>{"use strict";var t=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();e.exports=function(e,r,n,s){var i=t,o=s+n;e^=-1;for(var a=s;a<o;a++)e=e>>>8^i[255&(e^r[a])];return-1^e}},405:(e,t,r)=>{"use strict";var n,s=r(4236),i=r(342),o=r(6069),a=r(2869),c=r(8898),u=-2,l=258,h=262,p=103,d=113,f=666;function m(e,t){return e.msg=c[t],t}function w(e){return(e<<1)-(e>4?9:0)}function g(e){for(var t=e.length;--t>=0;)e[t]=0}function y(e){var t=e.state,r=t.pending;r>e.avail_out&&(r=e.avail_out),0!==r&&(s.arraySet(e.output,t.pending_buf,t.pending_out,r,e.next_out),e.next_out+=r,t.pending_out+=r,e.total_out+=r,e.avail_out-=r,t.pending-=r,0===t.pending&&(t.pending_out=0))}function b(e,t){i._tr_flush_block(e,e.block_start>=0?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,y(e.strm)}function v(e,t){e.pending_buf[e.pending++]=t}function x(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function _(e,t){var r,n,s=e.max_chain_length,i=e.strstart,o=e.prev_length,a=e.nice_match,c=e.strstart>e.w_size-h?e.strstart-(e.w_size-h):0,u=e.window,p=e.w_mask,d=e.prev,f=e.strstart+l,m=u[i+o-1],w=u[i+o];e.prev_length>=e.good_match&&(s>>=2),a>e.lookahead&&(a=e.lookahead);do{if(u[(r=t)+o]===w&&u[r+o-1]===m&&u[r]===u[i]&&u[++r]===u[i+1]){i+=2,r++;do{}while(u[++i]===u[++r]&&u[++i]===u[++r]&&u[++i]===u[++r]&&u[++i]===u[++r]&&u[++i]===u[++r]&&u[++i]===u[++r]&&u[++i]===u[++r]&&u[++i]===u[++r]&&i<f);if(n=l-(f-i),i=f-l,n>o){if(e.match_start=t,o=n,n>=a)break;m=u[i+o-1],w=u[i+o]}}}while((t=d[t&p])>c&&0!=--s);return o<=e.lookahead?o:e.lookahead}function E(e){var t,r,n,i,c,u,l,p,d,f,m=e.w_size;do{if(i=e.window_size-e.lookahead-e.strstart,e.strstart>=m+(m-h)){s.arraySet(e.window,e.window,m,m,0),e.match_start-=m,e.strstart-=m,e.block_start-=m,t=r=e.hash_size;do{n=e.head[--t],e.head[t]=n>=m?n-m:0}while(--r);t=r=m;do{n=e.prev[--t],e.prev[t]=n>=m?n-m:0}while(--r);i+=m}if(0===e.strm.avail_in)break;if(u=e.strm,l=e.window,p=e.strstart+e.lookahead,d=i,f=void 0,(f=u.avail_in)>d&&(f=d),r=0===f?0:(u.avail_in-=f,s.arraySet(l,u.input,u.next_in,f,p),1===u.state.wrap?u.adler=o(u.adler,l,f,p):2===u.state.wrap&&(u.adler=a(u.adler,l,f,p)),u.next_in+=f,u.total_in+=f,f),e.lookahead+=r,e.lookahead+e.insert>=3)for(c=e.strstart-e.insert,e.ins_h=e.window[c],e.ins_h=(e.ins_h<<e.hash_shift^e.window[c+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[c+3-1])&e.hash_mask,e.prev[c&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=c,c++,e.insert--,!(e.lookahead+e.insert<3)););}while(e.lookahead<h&&0!==e.strm.avail_in)}function T(e,t){for(var r,n;;){if(e.lookahead<h){if(E(e),e.lookahead<h&&0===t)return 1;if(0===e.lookahead)break}if(r=0,e.lookahead>=3&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+3-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==r&&e.strstart-r<=e.w_size-h&&(e.match_length=_(e,r)),e.match_length>=3)if(n=i._tr_tally(e,e.strstart-e.match_start,e.match_length-3),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=3){e.match_length--;do{e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+3-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart}while(0!=--e.match_length);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else n=i._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(n&&(b(e,!1),0===e.strm.avail_out))return 1}return e.insert=e.strstart<2?e.strstart:2,4===t?(b(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(b(e,!1),0===e.strm.avail_out)?1:2}function A(e,t){for(var r,n,s;;){if(e.lookahead<h){if(E(e),e.lookahead<h&&0===t)return 1;if(0===e.lookahead)break}if(r=0,e.lookahead>=3&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+3-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=2,0!==r&&e.prev_length<e.max_lazy_match&&e.strstart-r<=e.w_size-h&&(e.match_length=_(e,r),e.match_length<=5&&(1===e.strategy||3===e.match_length&&e.strstart-e.match_start>4096)&&(e.match_length=2)),e.prev_length>=3&&e.match_length<=e.prev_length){s=e.strstart+e.lookahead-3,n=i._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-3),e.lookahead-=e.prev_length-1,e.prev_length-=2;do{++e.strstart<=s&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+3-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart)}while(0!=--e.prev_length);if(e.match_available=0,e.match_length=2,e.strstart++,n&&(b(e,!1),0===e.strm.avail_out))return 1}else if(e.match_available){if((n=i._tr_tally(e,0,e.window[e.strstart-1]))&&b(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return 1}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(n=i._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<2?e.strstart:2,4===t?(b(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(b(e,!1),0===e.strm.avail_out)?1:2}function S(e,t,r,n,s){this.good_length=e,this.max_lazy=t,this.nice_length=r,this.max_chain=n,this.func=s}function I(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=8,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new s.Buf16(1146),this.dyn_dtree=new s.Buf16(122),this.bl_tree=new s.Buf16(78),g(this.dyn_ltree),g(this.dyn_dtree),g(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new s.Buf16(16),this.heap=new s.Buf16(573),g(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new s.Buf16(573),g(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function N(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=2,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?42:d,e.adler=2===t.wrap?0:1,t.last_flush=0,i._tr_init(t),0):m(e,u)}function R(e){var t,r=N(e);return 0===r&&((t=e.state).window_size=2*t.w_size,g(t.head),t.max_lazy_match=n[t.level].max_lazy,t.good_match=n[t.level].good_length,t.nice_match=n[t.level].nice_length,t.max_chain_length=n[t.level].max_chain,t.strstart=0,t.block_start=0,t.lookahead=0,t.insert=0,t.match_length=t.prev_length=2,t.match_available=0,t.ins_h=0),r}function k(e,t,r,n,i,o){if(!e)return u;var a=1;if(-1===t&&(t=6),n<0?(a=0,n=-n):n>15&&(a=2,n-=16),i<1||i>9||8!==r||n<8||n>15||t<0||t>9||o<0||o>4)return m(e,u);8===n&&(n=9);var c=new I;return e.state=c,c.strm=e,c.wrap=a,c.gzhead=null,c.w_bits=n,c.w_size=1<<c.w_bits,c.w_mask=c.w_size-1,c.hash_bits=i+7,c.hash_size=1<<c.hash_bits,c.hash_mask=c.hash_size-1,c.hash_shift=~~((c.hash_bits+3-1)/3),c.window=new s.Buf8(2*c.w_size),c.head=new s.Buf16(c.hash_size),c.prev=new s.Buf16(c.w_size),c.lit_bufsize=1<<i+6,c.pending_buf_size=4*c.lit_bufsize,c.pending_buf=new s.Buf8(c.pending_buf_size),c.d_buf=1*c.lit_bufsize,c.l_buf=3*c.lit_bufsize,c.level=t,c.strategy=o,c.method=r,R(e)}n=[new S(0,0,0,0,(function(e,t){var r=65535;for(r>e.pending_buf_size-5&&(r=e.pending_buf_size-5);;){if(e.lookahead<=1){if(E(e),0===e.lookahead&&0===t)return 1;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var n=e.block_start+r;if((0===e.strstart||e.strstart>=n)&&(e.lookahead=e.strstart-n,e.strstart=n,b(e,!1),0===e.strm.avail_out))return 1;if(e.strstart-e.block_start>=e.w_size-h&&(b(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,4===t?(b(e,!0),0===e.strm.avail_out?3:4):(e.strstart>e.block_start&&(b(e,!1),e.strm.avail_out),1)})),new S(4,4,8,4,T),new S(4,5,16,8,T),new S(4,6,32,32,T),new S(4,4,16,16,A),new S(8,16,32,32,A),new S(8,16,128,128,A),new S(8,32,128,256,A),new S(32,128,258,1024,A),new S(32,258,258,4096,A)],t.deflateInit=function(e,t){return k(e,t,8,15,8,0)},t.deflateInit2=k,t.deflateReset=R,t.deflateResetKeep=N,t.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?u:(e.state.gzhead=t,0):u},t.deflate=function(e,t){var r,s,o,c;if(!e||!e.state||t>5||t<0)return e?m(e,u):u;if(s=e.state,!e.output||!e.input&&0!==e.avail_in||s.status===f&&4!==t)return m(e,0===e.avail_out?-5:u);if(s.strm=e,r=s.last_flush,s.last_flush=t,42===s.status)if(2===s.wrap)e.adler=0,v(s,31),v(s,139),v(s,8),s.gzhead?(v(s,(s.gzhead.text?1:0)+(s.gzhead.hcrc?2:0)+(s.gzhead.extra?4:0)+(s.gzhead.name?8:0)+(s.gzhead.comment?16:0)),v(s,255&s.gzhead.time),v(s,s.gzhead.time>>8&255),v(s,s.gzhead.time>>16&255),v(s,s.gzhead.time>>24&255),v(s,9===s.level?2:s.strategy>=2||s.level<2?4:0),v(s,255&s.gzhead.os),s.gzhead.extra&&s.gzhead.extra.length&&(v(s,255&s.gzhead.extra.length),v(s,s.gzhead.extra.length>>8&255)),s.gzhead.hcrc&&(e.adler=a(e.adler,s.pending_buf,s.pending,0)),s.gzindex=0,s.status=69):(v(s,0),v(s,0),v(s,0),v(s,0),v(s,0),v(s,9===s.level?2:s.strategy>=2||s.level<2?4:0),v(s,3),s.status=d);else{var h=8+(s.w_bits-8<<4)<<8;h|=(s.strategy>=2||s.level<2?0:s.level<6?1:6===s.level?2:3)<<6,0!==s.strstart&&(h|=32),h+=31-h%31,s.status=d,x(s,h),0!==s.strstart&&(x(s,e.adler>>>16),x(s,65535&e.adler)),e.adler=1}if(69===s.status)if(s.gzhead.extra){for(o=s.pending;s.gzindex<(65535&s.gzhead.extra.length)&&(s.pending!==s.pending_buf_size||(s.gzhead.hcrc&&s.pending>o&&(e.adler=a(e.adler,s.pending_buf,s.pending-o,o)),y(e),o=s.pending,s.pending!==s.pending_buf_size));)v(s,255&s.gzhead.extra[s.gzindex]),s.gzindex++;s.gzhead.hcrc&&s.pending>o&&(e.adler=a(e.adler,s.pending_buf,s.pending-o,o)),s.gzindex===s.gzhead.extra.length&&(s.gzindex=0,s.status=73)}else s.status=73;if(73===s.status)if(s.gzhead.name){o=s.pending;do{if(s.pending===s.pending_buf_size&&(s.gzhead.hcrc&&s.pending>o&&(e.adler=a(e.adler,s.pending_buf,s.pending-o,o)),y(e),o=s.pending,s.pending===s.pending_buf_size)){c=1;break}c=s.gzindex<s.gzhead.name.length?255&s.gzhead.name.charCodeAt(s.gzindex++):0,v(s,c)}while(0!==c);s.gzhead.hcrc&&s.pending>o&&(e.adler=a(e.adler,s.pending_buf,s.pending-o,o)),0===c&&(s.gzindex=0,s.status=91)}else s.status=91;if(91===s.status)if(s.gzhead.comment){o=s.pending;do{if(s.pending===s.pending_buf_size&&(s.gzhead.hcrc&&s.pending>o&&(e.adler=a(e.adler,s.pending_buf,s.pending-o,o)),y(e),o=s.pending,s.pending===s.pending_buf_size)){c=1;break}c=s.gzindex<s.gzhead.comment.length?255&s.gzhead.comment.charCodeAt(s.gzindex++):0,v(s,c)}while(0!==c);s.gzhead.hcrc&&s.pending>o&&(e.adler=a(e.adler,s.pending_buf,s.pending-o,o)),0===c&&(s.status=p)}else s.status=p;if(s.status===p&&(s.gzhead.hcrc?(s.pending+2>s.pending_buf_size&&y(e),s.pending+2<=s.pending_buf_size&&(v(s,255&e.adler),v(s,e.adler>>8&255),e.adler=0,s.status=d)):s.status=d),0!==s.pending){if(y(e),0===e.avail_out)return s.last_flush=-1,0}else if(0===e.avail_in&&w(t)<=w(r)&&4!==t)return m(e,-5);if(s.status===f&&0!==e.avail_in)return m(e,-5);if(0!==e.avail_in||0!==s.lookahead||0!==t&&s.status!==f){var _=2===s.strategy?function(e,t){for(var r;;){if(0===e.lookahead&&(E(e),0===e.lookahead)){if(0===t)return 1;break}if(e.match_length=0,r=i._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,r&&(b(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,4===t?(b(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(b(e,!1),0===e.strm.avail_out)?1:2}(s,t):3===s.strategy?function(e,t){for(var r,n,s,o,a=e.window;;){if(e.lookahead<=l){if(E(e),e.lookahead<=l&&0===t)return 1;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=3&&e.strstart>0&&(n=a[s=e.strstart-1])===a[++s]&&n===a[++s]&&n===a[++s]){o=e.strstart+l;do{}while(n===a[++s]&&n===a[++s]&&n===a[++s]&&n===a[++s]&&n===a[++s]&&n===a[++s]&&n===a[++s]&&n===a[++s]&&s<o);e.match_length=l-(o-s),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=3?(r=i._tr_tally(e,1,e.match_length-3),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(r=i._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),r&&(b(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,4===t?(b(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(b(e,!1),0===e.strm.avail_out)?1:2}(s,t):n[s.level].func(s,t);if(3!==_&&4!==_||(s.status=f),1===_||3===_)return 0===e.avail_out&&(s.last_flush=-1),0;if(2===_&&(1===t?i._tr_align(s):5!==t&&(i._tr_stored_block(s,0,0,!1),3===t&&(g(s.head),0===s.lookahead&&(s.strstart=0,s.block_start=0,s.insert=0))),y(e),0===e.avail_out))return s.last_flush=-1,0}return 4!==t?0:s.wrap<=0?1:(2===s.wrap?(v(s,255&e.adler),v(s,e.adler>>8&255),v(s,e.adler>>16&255),v(s,e.adler>>24&255),v(s,255&e.total_in),v(s,e.total_in>>8&255),v(s,e.total_in>>16&255),v(s,e.total_in>>24&255)):(x(s,e.adler>>>16),x(s,65535&e.adler)),y(e),s.wrap>0&&(s.wrap=-s.wrap),0!==s.pending?0:1)},t.deflateEnd=function(e){var t;return e&&e.state?42!==(t=e.state.status)&&69!==t&&73!==t&&91!==t&&t!==p&&t!==d&&t!==f?m(e,u):(e.state=null,t===d?m(e,-3):0):u},t.deflateSetDictionary=function(e,t){var r,n,i,a,c,l,h,p,d=t.length;if(!e||!e.state)return u;if(2===(a=(r=e.state).wrap)||1===a&&42!==r.status||r.lookahead)return u;for(1===a&&(e.adler=o(e.adler,t,d,0)),r.wrap=0,d>=r.w_size&&(0===a&&(g(r.head),r.strstart=0,r.block_start=0,r.insert=0),p=new s.Buf8(r.w_size),s.arraySet(p,t,d-r.w_size,r.w_size,0),t=p,d=r.w_size),c=e.avail_in,l=e.next_in,h=e.input,e.avail_in=d,e.next_in=0,e.input=t,E(r);r.lookahead>=3;){n=r.strstart,i=r.lookahead-2;do{r.ins_h=(r.ins_h<<r.hash_shift^r.window[n+3-1])&r.hash_mask,r.prev[n&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=n,n++}while(--i);r.strstart=n,r.lookahead=2,E(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=2,r.match_available=0,e.next_in=l,e.input=h,e.avail_in=c,r.wrap=a,0},t.deflateInfo="pako deflate (from Nodeca project)"},2401:e=>{"use strict";e.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},4264:e=>{"use strict";e.exports=function(e,t){var r,n,s,i,o,a,c,u,l,h,p,d,f,m,w,g,y,b,v,x,_,E,T,A,S;r=e.state,n=e.next_in,A=e.input,s=n+(e.avail_in-5),i=e.next_out,S=e.output,o=i-(t-e.avail_out),a=i+(e.avail_out-257),c=r.dmax,u=r.wsize,l=r.whave,h=r.wnext,p=r.window,d=r.hold,f=r.bits,m=r.lencode,w=r.distcode,g=(1<<r.lenbits)-1,y=(1<<r.distbits)-1;e:do{f<15&&(d+=A[n++]<<f,f+=8,d+=A[n++]<<f,f+=8),b=m[d&g];t:for(;;){if(d>>>=v=b>>>24,f-=v,0==(v=b>>>16&255))S[i++]=65535&b;else{if(!(16&v)){if(0==(64&v)){b=m[(65535&b)+(d&(1<<v)-1)];continue t}if(32&v){r.mode=12;break e}e.msg="invalid literal/length code",r.mode=30;break e}x=65535&b,(v&=15)&&(f<v&&(d+=A[n++]<<f,f+=8),x+=d&(1<<v)-1,d>>>=v,f-=v),f<15&&(d+=A[n++]<<f,f+=8,d+=A[n++]<<f,f+=8),b=w[d&y];r:for(;;){if(d>>>=v=b>>>24,f-=v,!(16&(v=b>>>16&255))){if(0==(64&v)){b=w[(65535&b)+(d&(1<<v)-1)];continue r}e.msg="invalid distance code",r.mode=30;break e}if(_=65535&b,f<(v&=15)&&(d+=A[n++]<<f,(f+=8)<v&&(d+=A[n++]<<f,f+=8)),(_+=d&(1<<v)-1)>c){e.msg="invalid distance too far back",r.mode=30;break e}if(d>>>=v,f-=v,_>(v=i-o)){if((v=_-v)>l&&r.sane){e.msg="invalid distance too far back",r.mode=30;break e}if(E=0,T=p,0===h){if(E+=u-v,v<x){x-=v;do{S[i++]=p[E++]}while(--v);E=i-_,T=S}}else if(h<v){if(E+=u+h-v,(v-=h)<x){x-=v;do{S[i++]=p[E++]}while(--v);if(E=0,h<x){x-=v=h;do{S[i++]=p[E++]}while(--v);E=i-_,T=S}}}else if(E+=h-v,v<x){x-=v;do{S[i++]=p[E++]}while(--v);E=i-_,T=S}for(;x>2;)S[i++]=T[E++],S[i++]=T[E++],S[i++]=T[E++],x-=3;x&&(S[i++]=T[E++],x>1&&(S[i++]=T[E++]))}else{E=i-_;do{S[i++]=S[E++],S[i++]=S[E++],S[i++]=S[E++],x-=3}while(x>2);x&&(S[i++]=S[E++],x>1&&(S[i++]=S[E++]))}break}}break}}while(n<s&&i<a);n-=x=f>>3,d&=(1<<(f-=x<<3))-1,e.next_in=n,e.next_out=i,e.avail_in=n<s?s-n+5:5-(n-s),e.avail_out=i<a?a-i+257:257-(i-a),r.hold=d,r.bits=f}},7948:(e,t,r)=>{"use strict";var n=r(4236),s=r(6069),i=r(2869),o=r(4264),a=r(9241),c=-2,u=12,l=30;function h(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function p(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new n.Buf16(320),this.work=new n.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function d(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=1,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new n.Buf32(852),t.distcode=t.distdyn=new n.Buf32(592),t.sane=1,t.back=-1,0):c}function f(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,d(e)):c}function m(e,t){var r,n;return e&&e.state?(n=e.state,t<0?(r=0,t=-t):(r=1+(t>>4),t<48&&(t&=15)),t&&(t<8||t>15)?c:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=r,n.wbits=t,f(e))):c}function w(e,t){var r,n;return e?(n=new p,e.state=n,n.window=null,0!==(r=m(e,t))&&(e.state=null),r):c}var g,y,b=!0;function v(e){if(b){var t;for(g=new n.Buf32(512),y=new n.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(a(1,e.lens,0,288,g,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;a(2,e.lens,0,32,y,0,e.work,{bits:5}),b=!1}e.lencode=g,e.lenbits=9,e.distcode=y,e.distbits=5}function x(e,t,r,s){var i,o=e.state;return null===o.window&&(o.wsize=1<<o.wbits,o.wnext=0,o.whave=0,o.window=new n.Buf8(o.wsize)),s>=o.wsize?(n.arraySet(o.window,t,r-o.wsize,o.wsize,0),o.wnext=0,o.whave=o.wsize):((i=o.wsize-o.wnext)>s&&(i=s),n.arraySet(o.window,t,r-s,i,o.wnext),(s-=i)?(n.arraySet(o.window,t,r-s,s,0),o.wnext=s,o.whave=o.wsize):(o.wnext+=i,o.wnext===o.wsize&&(o.wnext=0),o.whave<o.wsize&&(o.whave+=i))),0}t.inflateReset=f,t.inflateReset2=m,t.inflateResetKeep=d,t.inflateInit=function(e){return w(e,15)},t.inflateInit2=w,t.inflate=function(e,t){var r,p,d,f,m,w,g,y,b,_,E,T,A,S,I,N,R,k,C,O,L,D,P,F,B=0,M=new n.Buf8(4),U=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return c;(r=e.state).mode===u&&(r.mode=13),m=e.next_out,d=e.output,g=e.avail_out,f=e.next_in,p=e.input,w=e.avail_in,y=r.hold,b=r.bits,_=w,E=g,D=0;e:for(;;)switch(r.mode){case 1:if(0===r.wrap){r.mode=13;break}for(;b<16;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}if(2&r.wrap&&35615===y){r.check=0,M[0]=255&y,M[1]=y>>>8&255,r.check=i(r.check,M,2,0),y=0,b=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&y)<<8)+(y>>8))%31){e.msg="incorrect header check",r.mode=l;break}if(8!=(15&y)){e.msg="unknown compression method",r.mode=l;break}if(b-=4,L=8+(15&(y>>>=4)),0===r.wbits)r.wbits=L;else if(L>r.wbits){e.msg="invalid window size",r.mode=l;break}r.dmax=1<<L,e.adler=r.check=1,r.mode=512&y?10:u,y=0,b=0;break;case 2:for(;b<16;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}if(r.flags=y,8!=(255&r.flags)){e.msg="unknown compression method",r.mode=l;break}if(57344&r.flags){e.msg="unknown header flags set",r.mode=l;break}r.head&&(r.head.text=y>>8&1),512&r.flags&&(M[0]=255&y,M[1]=y>>>8&255,r.check=i(r.check,M,2,0)),y=0,b=0,r.mode=3;case 3:for(;b<32;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}r.head&&(r.head.time=y),512&r.flags&&(M[0]=255&y,M[1]=y>>>8&255,M[2]=y>>>16&255,M[3]=y>>>24&255,r.check=i(r.check,M,4,0)),y=0,b=0,r.mode=4;case 4:for(;b<16;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}r.head&&(r.head.xflags=255&y,r.head.os=y>>8),512&r.flags&&(M[0]=255&y,M[1]=y>>>8&255,r.check=i(r.check,M,2,0)),y=0,b=0,r.mode=5;case 5:if(1024&r.flags){for(;b<16;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}r.length=y,r.head&&(r.head.extra_len=y),512&r.flags&&(M[0]=255&y,M[1]=y>>>8&255,r.check=i(r.check,M,2,0)),y=0,b=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&((T=r.length)>w&&(T=w),T&&(r.head&&(L=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),n.arraySet(r.head.extra,p,f,T,L)),512&r.flags&&(r.check=i(r.check,p,T,f)),w-=T,f+=T,r.length-=T),r.length))break e;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===w)break e;T=0;do{L=p[f+T++],r.head&&L&&r.length<65536&&(r.head.name+=String.fromCharCode(L))}while(L&&T<w);if(512&r.flags&&(r.check=i(r.check,p,T,f)),w-=T,f+=T,L)break e}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===w)break e;T=0;do{L=p[f+T++],r.head&&L&&r.length<65536&&(r.head.comment+=String.fromCharCode(L))}while(L&&T<w);if(512&r.flags&&(r.check=i(r.check,p,T,f)),w-=T,f+=T,L)break e}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;b<16;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}if(y!==(65535&r.check)){e.msg="header crc mismatch",r.mode=l;break}y=0,b=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),e.adler=r.check=0,r.mode=u;break;case 10:for(;b<32;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}e.adler=r.check=h(y),y=0,b=0,r.mode=11;case 11:if(0===r.havedict)return e.next_out=m,e.avail_out=g,e.next_in=f,e.avail_in=w,r.hold=y,r.bits=b,2;e.adler=r.check=1,r.mode=u;case u:if(5===t||6===t)break e;case 13:if(r.last){y>>>=7&b,b-=7&b,r.mode=27;break}for(;b<3;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}switch(r.last=1&y,b-=1,3&(y>>>=1)){case 0:r.mode=14;break;case 1:if(v(r),r.mode=20,6===t){y>>>=2,b-=2;break e}break;case 2:r.mode=17;break;case 3:e.msg="invalid block type",r.mode=l}y>>>=2,b-=2;break;case 14:for(y>>>=7&b,b-=7&b;b<32;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}if((65535&y)!=(y>>>16^65535)){e.msg="invalid stored block lengths",r.mode=l;break}if(r.length=65535&y,y=0,b=0,r.mode=15,6===t)break e;case 15:r.mode=16;case 16:if(T=r.length){if(T>w&&(T=w),T>g&&(T=g),0===T)break e;n.arraySet(d,p,f,T,m),w-=T,f+=T,g-=T,m+=T,r.length-=T;break}r.mode=u;break;case 17:for(;b<14;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}if(r.nlen=257+(31&y),y>>>=5,b-=5,r.ndist=1+(31&y),y>>>=5,b-=5,r.ncode=4+(15&y),y>>>=4,b-=4,r.nlen>286||r.ndist>30){e.msg="too many length or distance symbols",r.mode=l;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;b<3;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}r.lens[U[r.have++]]=7&y,y>>>=3,b-=3}for(;r.have<19;)r.lens[U[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,P={bits:r.lenbits},D=a(0,r.lens,0,19,r.lencode,0,r.work,P),r.lenbits=P.bits,D){e.msg="invalid code lengths set",r.mode=l;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;N=(B=r.lencode[y&(1<<r.lenbits)-1])>>>16&255,R=65535&B,!((I=B>>>24)<=b);){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}if(R<16)y>>>=I,b-=I,r.lens[r.have++]=R;else{if(16===R){for(F=I+2;b<F;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}if(y>>>=I,b-=I,0===r.have){e.msg="invalid bit length repeat",r.mode=l;break}L=r.lens[r.have-1],T=3+(3&y),y>>>=2,b-=2}else if(17===R){for(F=I+3;b<F;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}b-=I,L=0,T=3+(7&(y>>>=I)),y>>>=3,b-=3}else{for(F=I+7;b<F;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}b-=I,L=0,T=11+(127&(y>>>=I)),y>>>=7,b-=7}if(r.have+T>r.nlen+r.ndist){e.msg="invalid bit length repeat",r.mode=l;break}for(;T--;)r.lens[r.have++]=L}}if(r.mode===l)break;if(0===r.lens[256]){e.msg="invalid code -- missing end-of-block",r.mode=l;break}if(r.lenbits=9,P={bits:r.lenbits},D=a(1,r.lens,0,r.nlen,r.lencode,0,r.work,P),r.lenbits=P.bits,D){e.msg="invalid literal/lengths set",r.mode=l;break}if(r.distbits=6,r.distcode=r.distdyn,P={bits:r.distbits},D=a(2,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,P),r.distbits=P.bits,D){e.msg="invalid distances set",r.mode=l;break}if(r.mode=20,6===t)break e;case 20:r.mode=21;case 21:if(w>=6&&g>=258){e.next_out=m,e.avail_out=g,e.next_in=f,e.avail_in=w,r.hold=y,r.bits=b,o(e,E),m=e.next_out,d=e.output,g=e.avail_out,f=e.next_in,p=e.input,w=e.avail_in,y=r.hold,b=r.bits,r.mode===u&&(r.back=-1);break}for(r.back=0;N=(B=r.lencode[y&(1<<r.lenbits)-1])>>>16&255,R=65535&B,!((I=B>>>24)<=b);){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}if(N&&0==(240&N)){for(k=I,C=N,O=R;N=(B=r.lencode[O+((y&(1<<k+C)-1)>>k)])>>>16&255,R=65535&B,!(k+(I=B>>>24)<=b);){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}y>>>=k,b-=k,r.back+=k}if(y>>>=I,b-=I,r.back+=I,r.length=R,0===N){r.mode=26;break}if(32&N){r.back=-1,r.mode=u;break}if(64&N){e.msg="invalid literal/length code",r.mode=l;break}r.extra=15&N,r.mode=22;case 22:if(r.extra){for(F=r.extra;b<F;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}r.length+=y&(1<<r.extra)-1,y>>>=r.extra,b-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;N=(B=r.distcode[y&(1<<r.distbits)-1])>>>16&255,R=65535&B,!((I=B>>>24)<=b);){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}if(0==(240&N)){for(k=I,C=N,O=R;N=(B=r.distcode[O+((y&(1<<k+C)-1)>>k)])>>>16&255,R=65535&B,!(k+(I=B>>>24)<=b);){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}y>>>=k,b-=k,r.back+=k}if(y>>>=I,b-=I,r.back+=I,64&N){e.msg="invalid distance code",r.mode=l;break}r.offset=R,r.extra=15&N,r.mode=24;case 24:if(r.extra){for(F=r.extra;b<F;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}r.offset+=y&(1<<r.extra)-1,y>>>=r.extra,b-=r.extra,r.back+=r.extra}if(r.offset>r.dmax){e.msg="invalid distance too far back",r.mode=l;break}r.mode=25;case 25:if(0===g)break e;if(T=E-g,r.offset>T){if((T=r.offset-T)>r.whave&&r.sane){e.msg="invalid distance too far back",r.mode=l;break}T>r.wnext?(T-=r.wnext,A=r.wsize-T):A=r.wnext-T,T>r.length&&(T=r.length),S=r.window}else S=d,A=m-r.offset,T=r.length;T>g&&(T=g),g-=T,r.length-=T;do{d[m++]=S[A++]}while(--T);0===r.length&&(r.mode=21);break;case 26:if(0===g)break e;d[m++]=r.length,g--,r.mode=21;break;case 27:if(r.wrap){for(;b<32;){if(0===w)break e;w--,y|=p[f++]<<b,b+=8}if(E-=g,e.total_out+=E,r.total+=E,E&&(e.adler=r.check=r.flags?i(r.check,d,E,m-E):s(r.check,d,E,m-E)),E=g,(r.flags?y:h(y))!==r.check){e.msg="incorrect data check",r.mode=l;break}y=0,b=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;b<32;){if(0===w)break e;w--,y+=p[f++]<<b,b+=8}if(y!==(4294967295&r.total)){e.msg="incorrect length check",r.mode=l;break}y=0,b=0}r.mode=29;case 29:D=1;break e;case l:D=-3;break e;case 31:return-4;default:return c}return e.next_out=m,e.avail_out=g,e.next_in=f,e.avail_in=w,r.hold=y,r.bits=b,(r.wsize||E!==e.avail_out&&r.mode<l&&(r.mode<27||4!==t))&&x(e,e.output,e.next_out,E-e.avail_out)?(r.mode=31,-4):(_-=e.avail_in,E-=e.avail_out,e.total_in+=_,e.total_out+=E,r.total+=E,r.wrap&&E&&(e.adler=r.check=r.flags?i(r.check,d,E,e.next_out-E):s(r.check,d,E,e.next_out-E)),e.data_type=r.bits+(r.last?64:0)+(r.mode===u?128:0)+(20===r.mode||15===r.mode?256:0),(0===_&&0===E||4===t)&&0===D&&(D=-5),D)},t.inflateEnd=function(e){if(!e||!e.state)return c;var t=e.state;return t.window&&(t.window=null),e.state=null,0},t.inflateGetHeader=function(e,t){var r;return e&&e.state?0==(2&(r=e.state).wrap)?c:(r.head=t,t.done=!1,0):c},t.inflateSetDictionary=function(e,t){var r,n=t.length;return e&&e.state?0!==(r=e.state).wrap&&11!==r.mode?c:11===r.mode&&s(1,t,n,0)!==r.check?-3:x(e,t,n,n)?(r.mode=31,-4):(r.havedict=1,0):c},t.inflateInfo="pako inflate (from Nodeca project)"},9241:(e,t,r)=>{"use strict";var n=r(4236),s=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],i=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],o=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],a=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];e.exports=function(e,t,r,c,u,l,h,p){var d,f,m,w,g,y,b,v,x,_=p.bits,E=0,T=0,A=0,S=0,I=0,N=0,R=0,k=0,C=0,O=0,L=null,D=0,P=new n.Buf16(16),F=new n.Buf16(16),B=null,M=0;for(E=0;E<=15;E++)P[E]=0;for(T=0;T<c;T++)P[t[r+T]]++;for(I=_,S=15;S>=1&&0===P[S];S--);if(I>S&&(I=S),0===S)return u[l++]=20971520,u[l++]=20971520,p.bits=1,0;for(A=1;A<S&&0===P[A];A++);for(I<A&&(I=A),k=1,E=1;E<=15;E++)if(k<<=1,(k-=P[E])<0)return-1;if(k>0&&(0===e||1!==S))return-1;for(F[1]=0,E=1;E<15;E++)F[E+1]=F[E]+P[E];for(T=0;T<c;T++)0!==t[r+T]&&(h[F[t[r+T]]++]=T);if(0===e?(L=B=h,y=19):1===e?(L=s,D-=257,B=i,M-=257,y=256):(L=o,B=a,y=-1),O=0,T=0,E=A,g=l,N=I,R=0,m=-1,w=(C=1<<I)-1,1===e&&C>852||2===e&&C>592)return 1;for(;;){b=E-R,h[T]<y?(v=0,x=h[T]):h[T]>y?(v=B[M+h[T]],x=L[D+h[T]]):(v=96,x=0),d=1<<E-R,A=f=1<<N;do{u[g+(O>>R)+(f-=d)]=b<<24|v<<16|x|0}while(0!==f);for(d=1<<E-1;O&d;)d>>=1;if(0!==d?(O&=d-1,O+=d):O=0,T++,0==--P[E]){if(E===S)break;E=t[r+h[T]]}if(E>I&&(O&w)!==m){for(0===R&&(R=I),g+=A,k=1<<(N=E-R);N+R<S&&!((k-=P[N+R])<=0);)N++,k<<=1;if(C+=1<<N,1===e&&C>852||2===e&&C>592)return 1;u[m=O&w]=I<<24|N<<16|g-l|0}}return 0!==O&&(u[g+O]=E-R<<24|64<<16|0),p.bits=I,0}},8898:e=>{"use strict";e.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},342:(e,t,r)=>{"use strict";var n=r(4236);function s(e){for(var t=e.length;--t>=0;)e[t]=0}var i=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],o=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],a=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],c=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],u=new Array(576);s(u);var l=new Array(60);s(l);var h=new Array(512);s(h);var p=new Array(256);s(p);var d=new Array(29);s(d);var f,m,w,g=new Array(30);function y(e,t,r,n,s){this.static_tree=e,this.extra_bits=t,this.extra_base=r,this.elems=n,this.max_length=s,this.has_stree=e&&e.length}function b(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function v(e){return e<256?h[e]:h[256+(e>>>7)]}function x(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function _(e,t,r){e.bi_valid>16-r?(e.bi_buf|=t<<e.bi_valid&65535,x(e,e.bi_buf),e.bi_buf=t>>16-e.bi_valid,e.bi_valid+=r-16):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=r)}function E(e,t,r){_(e,r[2*t],r[2*t+1])}function T(e,t){var r=0;do{r|=1&e,e>>>=1,r<<=1}while(--t>0);return r>>>1}function A(e,t,r){var n,s,i=new Array(16),o=0;for(n=1;n<=15;n++)i[n]=o=o+r[n-1]<<1;for(s=0;s<=t;s++){var a=e[2*s+1];0!==a&&(e[2*s]=T(i[a]++,a))}}function S(e){var t;for(t=0;t<286;t++)e.dyn_ltree[2*t]=0;for(t=0;t<30;t++)e.dyn_dtree[2*t]=0;for(t=0;t<19;t++)e.bl_tree[2*t]=0;e.dyn_ltree[512]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function I(e){e.bi_valid>8?x(e,e.bi_buf):e.bi_valid>0&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function N(e,t,r,n){var s=2*t,i=2*r;return e[s]<e[i]||e[s]===e[i]&&n[t]<=n[r]}function R(e,t,r){for(var n=e.heap[r],s=r<<1;s<=e.heap_len&&(s<e.heap_len&&N(t,e.heap[s+1],e.heap[s],e.depth)&&s++,!N(t,n,e.heap[s],e.depth));)e.heap[r]=e.heap[s],r=s,s<<=1;e.heap[r]=n}function k(e,t,r){var n,s,a,c,u=0;if(0!==e.last_lit)do{n=e.pending_buf[e.d_buf+2*u]<<8|e.pending_buf[e.d_buf+2*u+1],s=e.pending_buf[e.l_buf+u],u++,0===n?E(e,s,t):(E(e,(a=p[s])+256+1,t),0!==(c=i[a])&&_(e,s-=d[a],c),E(e,a=v(--n),r),0!==(c=o[a])&&_(e,n-=g[a],c))}while(u<e.last_lit);E(e,256,t)}function C(e,t){var r,n,s,i=t.dyn_tree,o=t.stat_desc.static_tree,a=t.stat_desc.has_stree,c=t.stat_desc.elems,u=-1;for(e.heap_len=0,e.heap_max=573,r=0;r<c;r++)0!==i[2*r]?(e.heap[++e.heap_len]=u=r,e.depth[r]=0):i[2*r+1]=0;for(;e.heap_len<2;)i[2*(s=e.heap[++e.heap_len]=u<2?++u:0)]=1,e.depth[s]=0,e.opt_len--,a&&(e.static_len-=o[2*s+1]);for(t.max_code=u,r=e.heap_len>>1;r>=1;r--)R(e,i,r);s=c;do{r=e.heap[1],e.heap[1]=e.heap[e.heap_len--],R(e,i,1),n=e.heap[1],e.heap[--e.heap_max]=r,e.heap[--e.heap_max]=n,i[2*s]=i[2*r]+i[2*n],e.depth[s]=(e.depth[r]>=e.depth[n]?e.depth[r]:e.depth[n])+1,i[2*r+1]=i[2*n+1]=s,e.heap[1]=s++,R(e,i,1)}while(e.heap_len>=2);e.heap[--e.heap_max]=e.heap[1],function(e,t){var r,n,s,i,o,a,c=t.dyn_tree,u=t.max_code,l=t.stat_desc.static_tree,h=t.stat_desc.has_stree,p=t.stat_desc.extra_bits,d=t.stat_desc.extra_base,f=t.stat_desc.max_length,m=0;for(i=0;i<=15;i++)e.bl_count[i]=0;for(c[2*e.heap[e.heap_max]+1]=0,r=e.heap_max+1;r<573;r++)(i=c[2*c[2*(n=e.heap[r])+1]+1]+1)>f&&(i=f,m++),c[2*n+1]=i,n>u||(e.bl_count[i]++,o=0,n>=d&&(o=p[n-d]),a=c[2*n],e.opt_len+=a*(i+o),h&&(e.static_len+=a*(l[2*n+1]+o)));if(0!==m){do{for(i=f-1;0===e.bl_count[i];)i--;e.bl_count[i]--,e.bl_count[i+1]+=2,e.bl_count[f]--,m-=2}while(m>0);for(i=f;0!==i;i--)for(n=e.bl_count[i];0!==n;)(s=e.heap[--r])>u||(c[2*s+1]!==i&&(e.opt_len+=(i-c[2*s+1])*c[2*s],c[2*s+1]=i),n--)}}(e,t),A(i,u,e.bl_count)}function O(e,t,r){var n,s,i=-1,o=t[1],a=0,c=7,u=4;for(0===o&&(c=138,u=3),t[2*(r+1)+1]=65535,n=0;n<=r;n++)s=o,o=t[2*(n+1)+1],++a<c&&s===o||(a<u?e.bl_tree[2*s]+=a:0!==s?(s!==i&&e.bl_tree[2*s]++,e.bl_tree[32]++):a<=10?e.bl_tree[34]++:e.bl_tree[36]++,a=0,i=s,0===o?(c=138,u=3):s===o?(c=6,u=3):(c=7,u=4))}function L(e,t,r){var n,s,i=-1,o=t[1],a=0,c=7,u=4;for(0===o&&(c=138,u=3),n=0;n<=r;n++)if(s=o,o=t[2*(n+1)+1],!(++a<c&&s===o)){if(a<u)do{E(e,s,e.bl_tree)}while(0!=--a);else 0!==s?(s!==i&&(E(e,s,e.bl_tree),a--),E(e,16,e.bl_tree),_(e,a-3,2)):a<=10?(E(e,17,e.bl_tree),_(e,a-3,3)):(E(e,18,e.bl_tree),_(e,a-11,7));a=0,i=s,0===o?(c=138,u=3):s===o?(c=6,u=3):(c=7,u=4)}}s(g);var D=!1;function P(e,t,r,s){_(e,0+(s?1:0),3),function(e,t,r,s){I(e),x(e,r),x(e,~r),n.arraySet(e.pending_buf,e.window,t,r,e.pending),e.pending+=r}(e,t,r)}t._tr_init=function(e){D||(function(){var e,t,r,n,s,c=new Array(16);for(r=0,n=0;n<28;n++)for(d[n]=r,e=0;e<1<<i[n];e++)p[r++]=n;for(p[r-1]=n,s=0,n=0;n<16;n++)for(g[n]=s,e=0;e<1<<o[n];e++)h[s++]=n;for(s>>=7;n<30;n++)for(g[n]=s<<7,e=0;e<1<<o[n]-7;e++)h[256+s++]=n;for(t=0;t<=15;t++)c[t]=0;for(e=0;e<=143;)u[2*e+1]=8,e++,c[8]++;for(;e<=255;)u[2*e+1]=9,e++,c[9]++;for(;e<=279;)u[2*e+1]=7,e++,c[7]++;for(;e<=287;)u[2*e+1]=8,e++,c[8]++;for(A(u,287,c),e=0;e<30;e++)l[2*e+1]=5,l[2*e]=T(e,5);f=new y(u,i,257,286,15),m=new y(l,o,0,30,15),w=new y(new Array(0),a,0,19,7)}(),D=!0),e.l_desc=new b(e.dyn_ltree,f),e.d_desc=new b(e.dyn_dtree,m),e.bl_desc=new b(e.bl_tree,w),e.bi_buf=0,e.bi_valid=0,S(e)},t._tr_stored_block=P,t._tr_flush_block=function(e,t,r,n){var s,i,o=0;e.level>0?(2===e.strm.data_type&&(e.strm.data_type=function(e){var t,r=4093624447;for(t=0;t<=31;t++,r>>>=1)if(1&r&&0!==e.dyn_ltree[2*t])return 0;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return 1;for(t=32;t<256;t++)if(0!==e.dyn_ltree[2*t])return 1;return 0}(e)),C(e,e.l_desc),C(e,e.d_desc),o=function(e){var t;for(O(e,e.dyn_ltree,e.l_desc.max_code),O(e,e.dyn_dtree,e.d_desc.max_code),C(e,e.bl_desc),t=18;t>=3&&0===e.bl_tree[2*c[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),s=e.opt_len+3+7>>>3,(i=e.static_len+3+7>>>3)<=s&&(s=i)):s=i=r+5,r+4<=s&&-1!==t?P(e,t,r,n):4===e.strategy||i===s?(_(e,2+(n?1:0),3),k(e,u,l)):(_(e,4+(n?1:0),3),function(e,t,r,n){var s;for(_(e,t-257,5),_(e,r-1,5),_(e,n-4,4),s=0;s<n;s++)_(e,e.bl_tree[2*c[s]+1],3);L(e,e.dyn_ltree,t-1),L(e,e.dyn_dtree,r-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,o+1),k(e,e.dyn_ltree,e.dyn_dtree)),S(e),n&&I(e)},t._tr_tally=function(e,t,r){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&r,e.last_lit++,0===t?e.dyn_ltree[2*r]++:(e.matches++,t--,e.dyn_ltree[2*(p[r]+256+1)]++,e.dyn_dtree[2*v(t)]++),e.last_lit===e.lit_bufsize-1},t._tr_align=function(e){_(e,2,3),E(e,256,u),function(e){16===e.bi_valid?(x(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):e.bi_valid>=8&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},2292:e=>{"use strict";e.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},4155:e=>{var t,r,n=e.exports={};function s(){throw new Error("setTimeout has not been defined")}function i(){throw new Error("clearTimeout has not been defined")}function o(e){if(t===setTimeout)return setTimeout(e,0);if((t===s||!t)&&setTimeout)return t=setTimeout,setTimeout(e,0);try{return t(e,0)}catch(r){try{return t.call(null,e,0)}catch(r){return t.call(this,e,0)}}}!function(){try{t="function"==typeof setTimeout?setTimeout:s}catch(e){t=s}try{r="function"==typeof clearTimeout?clearTimeout:i}catch(e){r=i}}();var a,c=[],u=!1,l=-1;function h(){u&&a&&(u=!1,a.length?c=a.concat(c):l=-1,c.length&&p())}function p(){if(!u){var e=o(h);u=!0;for(var t=c.length;t;){for(a=c,c=[];++l<t;)a&&a[l].run();l=-1,t=c.length}a=null,u=!1,function(e){if(r===clearTimeout)return clearTimeout(e);if((r===i||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(e);try{r(e)}catch(t){try{return r.call(null,e)}catch(t){return r.call(this,e)}}}(e)}}function d(e,t){this.fun=e,this.array=t}function f(){}n.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var r=1;r<arguments.length;r++)t[r-1]=arguments[r];c.push(new d(e,t)),1!==c.length||u||o(p)},d.prototype.run=function(){this.fun.apply(null,this.array)},n.title="browser",n.browser=!0,n.env={},n.argv=[],n.version="",n.versions={},n.on=f,n.addListener=f,n.once=f,n.off=f,n.removeListener=f,n.removeAllListeners=f,n.emit=f,n.prependListener=f,n.prependOnceListener=f,n.listeners=function(e){return[]},n.binding=function(e){throw new Error("process.binding is not supported")},n.cwd=function(){return"/"},n.chdir=function(e){throw new Error("process.chdir is not supported")},n.umask=function(){return 0}},9509:(e,t,r)=>{var n=r(8764),s=n.Buffer;function i(e,t){for(var r in e)t[r]=e[r]}function o(e,t,r){return s(e,t,r)}s.from&&s.alloc&&s.allocUnsafe&&s.allocUnsafeSlow?e.exports=n:(i(n,t),t.Buffer=o),i(s,o),o.from=function(e,t,r){if("number"==typeof e)throw new TypeError("Argument must not be a number");return s(e,t,r)},o.alloc=function(e,t,r){if("number"!=typeof e)throw new TypeError("Argument must be a number");var n=s(e);return void 0!==t?"string"==typeof r?n.fill(t,r):n.fill(t):n.fill(0),n},o.allocUnsafe=function(e){if("number"!=typeof e)throw new TypeError("Argument must be a number");return s(e)},o.allocUnsafeSlow=function(e){if("number"!=typeof e)throw new TypeError("Argument must be a number");return n.SlowBuffer(e)}},6099:(e,t,r)=>{!function(e){e.parser=function(e,t){return new s(e,t)},e.SAXParser=s,e.SAXStream=o,e.createStream=function(e,t){return new o(e,t)},e.MAX_BUFFER_LENGTH=65536;var t,n=["comment","sgmlDecl","textNode","tagName","doctype","procInstName","procInstBody","entity","attribName","attribValue","cdata","script"];function s(t,r){if(!(this instanceof s))return new s(t,r);var i=this;!function(e){for(var t=0,r=n.length;t<r;t++)e[n[t]]=""}(i),i.q=i.c="",i.bufferCheckPosition=e.MAX_BUFFER_LENGTH,i.opt=r||{},i.opt.lowercase=i.opt.lowercase||i.opt.lowercasetags,i.looseCase=i.opt.lowercase?"toLowerCase":"toUpperCase",i.tags=[],i.closed=i.closedRoot=i.sawRoot=!1,i.tag=i.error=null,i.strict=!!t,i.noscript=!(!t&&!i.opt.noscript),i.state=_.BEGIN,i.strictEntities=i.opt.strictEntities,i.ENTITIES=i.strictEntities?Object.create(e.XML_ENTITIES):Object.create(e.ENTITIES),i.attribList=[],i.opt.xmlns&&(i.ns=Object.create(u)),i.trackPosition=!1!==i.opt.position,i.trackPosition&&(i.position=i.line=i.column=0),T(i,"onready")}e.EVENTS=["text","processinginstruction","sgmldeclaration","doctype","comment","opentagstart","attribute","opentag","closetag","opencdata","cdata","closecdata","error","end","ready","script","opennamespace","closenamespace"],Object.create||(Object.create=function(e){function t(){}return t.prototype=e,new t}),Object.keys||(Object.keys=function(e){var t=[];for(var r in e)e.hasOwnProperty(r)&&t.push(r);return t}),s.prototype={end:function(){R(this)},write:function(t){var r=this;if(this.error)throw this.error;if(r.closed)return N(r,"Cannot write after close. Assign an onready handler.");if(null===t)return R(r);"object"==typeof t&&(t=t.toString());for(var s=0,i="";i=M(t,s++),r.c=i,i;)switch(r.trackPosition&&(r.position++,"\n"===i?(r.line++,r.column=0):r.column++),r.state){case _.BEGIN:if(r.state=_.BEGIN_WHITESPACE,"\ufeff"===i)continue;B(r,i);continue;case _.BEGIN_WHITESPACE:B(r,i);continue;case _.TEXT:if(r.sawRoot&&!r.closedRoot){for(var o=s-1;i&&"<"!==i&&"&"!==i;)(i=M(t,s++))&&r.trackPosition&&(r.position++,"\n"===i?(r.line++,r.column=0):r.column++);r.textNode+=t.substring(o,s-1)}"<"!==i||r.sawRoot&&r.closedRoot&&!r.strict?(f(i)||r.sawRoot&&!r.closedRoot||k(r,"Text data outside of root node."),"&"===i?r.state=_.TEXT_ENTITY:r.textNode+=i):(r.state=_.OPEN_WAKA,r.startTagPosition=r.position);continue;case _.SCRIPT:"<"===i?r.state=_.SCRIPT_ENDING:r.script+=i;continue;case _.SCRIPT_ENDING:"/"===i?r.state=_.CLOSE_TAG:(r.script+="<"+i,r.state=_.SCRIPT);continue;case _.OPEN_WAKA:if("!"===i)r.state=_.SGML_DECL,r.sgmlDecl="";else if(f(i));else if(g(l,i))r.state=_.OPEN_TAG,r.tagName=i;else if("/"===i)r.state=_.CLOSE_TAG,r.tagName="";else if("?"===i)r.state=_.PROC_INST,r.procInstName=r.procInstBody="";else{if(k(r,"Unencoded <"),r.startTagPosition+1<r.position){var a=r.position-r.startTagPosition;i=new Array(a).join(" ")+i}r.textNode+="<"+i,r.state=_.TEXT}continue;case _.SGML_DECL:"[CDATA["===(r.sgmlDecl+i).toUpperCase()?(A(r,"onopencdata"),r.state=_.CDATA,r.sgmlDecl="",r.cdata=""):r.sgmlDecl+i==="--"?(r.state=_.COMMENT,r.comment="",r.sgmlDecl=""):"DOCTYPE"===(r.sgmlDecl+i).toUpperCase()?(r.state=_.DOCTYPE,(r.doctype||r.sawRoot)&&k(r,"Inappropriately located doctype declaration"),r.doctype="",r.sgmlDecl=""):">"===i?(A(r,"onsgmldeclaration",r.sgmlDecl),r.sgmlDecl="",r.state=_.TEXT):m(i)?(r.state=_.SGML_DECL_QUOTED,r.sgmlDecl+=i):r.sgmlDecl+=i;continue;case _.SGML_DECL_QUOTED:i===r.q&&(r.state=_.SGML_DECL,r.q=""),r.sgmlDecl+=i;continue;case _.DOCTYPE:">"===i?(r.state=_.TEXT,A(r,"ondoctype",r.doctype),r.doctype=!0):(r.doctype+=i,"["===i?r.state=_.DOCTYPE_DTD:m(i)&&(r.state=_.DOCTYPE_QUOTED,r.q=i));continue;case _.DOCTYPE_QUOTED:r.doctype+=i,i===r.q&&(r.q="",r.state=_.DOCTYPE);continue;case _.DOCTYPE_DTD:r.doctype+=i,"]"===i?r.state=_.DOCTYPE:m(i)&&(r.state=_.DOCTYPE_DTD_QUOTED,r.q=i);continue;case _.DOCTYPE_DTD_QUOTED:r.doctype+=i,i===r.q&&(r.state=_.DOCTYPE_DTD,r.q="");continue;case _.COMMENT:"-"===i?r.state=_.COMMENT_ENDING:r.comment+=i;continue;case _.COMMENT_ENDING:"-"===i?(r.state=_.COMMENT_ENDED,r.comment=I(r.opt,r.comment),r.comment&&A(r,"oncomment",r.comment),r.comment=""):(r.comment+="-"+i,r.state=_.COMMENT);continue;case _.COMMENT_ENDED:">"!==i?(k(r,"Malformed comment"),r.comment+="--"+i,r.state=_.COMMENT):r.state=_.TEXT;continue;case _.CDATA:"]"===i?r.state=_.CDATA_ENDING:r.cdata+=i;continue;case _.CDATA_ENDING:"]"===i?r.state=_.CDATA_ENDING_2:(r.cdata+="]"+i,r.state=_.CDATA);continue;case _.CDATA_ENDING_2:">"===i?(r.cdata&&A(r,"oncdata",r.cdata),A(r,"onclosecdata"),r.cdata="",r.state=_.TEXT):"]"===i?r.cdata+="]":(r.cdata+="]]"+i,r.state=_.CDATA);continue;case _.PROC_INST:"?"===i?r.state=_.PROC_INST_ENDING:f(i)?r.state=_.PROC_INST_BODY:r.procInstName+=i;continue;case _.PROC_INST_BODY:if(!r.procInstBody&&f(i))continue;"?"===i?r.state=_.PROC_INST_ENDING:r.procInstBody+=i;continue;case _.PROC_INST_ENDING:">"===i?(A(r,"onprocessinginstruction",{name:r.procInstName,body:r.procInstBody}),r.procInstName=r.procInstBody="",r.state=_.TEXT):(r.procInstBody+="?"+i,r.state=_.PROC_INST_BODY);continue;case _.OPEN_TAG:g(h,i)?r.tagName+=i:(C(r),">"===i?D(r):"/"===i?r.state=_.OPEN_TAG_SLASH:(f(i)||k(r,"Invalid character in tag name"),r.state=_.ATTRIB));continue;case _.OPEN_TAG_SLASH:">"===i?(D(r,!0),P(r)):(k(r,"Forward-slash in opening tag not followed by >"),r.state=_.ATTRIB);continue;case _.ATTRIB:if(f(i))continue;">"===i?D(r):"/"===i?r.state=_.OPEN_TAG_SLASH:g(l,i)?(r.attribName=i,r.attribValue="",r.state=_.ATTRIB_NAME):k(r,"Invalid attribute name");continue;case _.ATTRIB_NAME:"="===i?r.state=_.ATTRIB_VALUE:">"===i?(k(r,"Attribute without value"),r.attribValue=r.attribName,L(r),D(r)):f(i)?r.state=_.ATTRIB_NAME_SAW_WHITE:g(h,i)?r.attribName+=i:k(r,"Invalid attribute name");continue;case _.ATTRIB_NAME_SAW_WHITE:if("="===i)r.state=_.ATTRIB_VALUE;else{if(f(i))continue;k(r,"Attribute without value"),r.tag.attributes[r.attribName]="",r.attribValue="",A(r,"onattribute",{name:r.attribName,value:""}),r.attribName="",">"===i?D(r):g(l,i)?(r.attribName=i,r.state=_.ATTRIB_NAME):(k(r,"Invalid attribute name"),r.state=_.ATTRIB)}continue;case _.ATTRIB_VALUE:if(f(i))continue;m(i)?(r.q=i,r.state=_.ATTRIB_VALUE_QUOTED):(k(r,"Unquoted attribute value"),r.state=_.ATTRIB_VALUE_UNQUOTED,r.attribValue=i);continue;case _.ATTRIB_VALUE_QUOTED:if(i!==r.q){"&"===i?r.state=_.ATTRIB_VALUE_ENTITY_Q:r.attribValue+=i;continue}L(r),r.q="",r.state=_.ATTRIB_VALUE_CLOSED;continue;case _.ATTRIB_VALUE_CLOSED:f(i)?r.state=_.ATTRIB:">"===i?D(r):"/"===i?r.state=_.OPEN_TAG_SLASH:g(l,i)?(k(r,"No whitespace between attributes"),r.attribName=i,r.attribValue="",r.state=_.ATTRIB_NAME):k(r,"Invalid attribute name");continue;case _.ATTRIB_VALUE_UNQUOTED:if(!w(i)){"&"===i?r.state=_.ATTRIB_VALUE_ENTITY_U:r.attribValue+=i;continue}L(r),">"===i?D(r):r.state=_.ATTRIB;continue;case _.CLOSE_TAG:if(r.tagName)">"===i?P(r):g(h,i)?r.tagName+=i:r.script?(r.script+="</"+r.tagName,r.tagName="",r.state=_.SCRIPT):(f(i)||k(r,"Invalid tagname in closing tag"),r.state=_.CLOSE_TAG_SAW_WHITE);else{if(f(i))continue;y(l,i)?r.script?(r.script+="</"+i,r.state=_.SCRIPT):k(r,"Invalid tagname in closing tag."):r.tagName=i}continue;case _.CLOSE_TAG_SAW_WHITE:if(f(i))continue;">"===i?P(r):k(r,"Invalid characters in closing tag");continue;case _.TEXT_ENTITY:case _.ATTRIB_VALUE_ENTITY_Q:case _.ATTRIB_VALUE_ENTITY_U:var c,u;switch(r.state){case _.TEXT_ENTITY:c=_.TEXT,u="textNode";break;case _.ATTRIB_VALUE_ENTITY_Q:c=_.ATTRIB_VALUE_QUOTED,u="attribValue";break;case _.ATTRIB_VALUE_ENTITY_U:c=_.ATTRIB_VALUE_UNQUOTED,u="attribValue"}";"===i?(r[u]+=F(r),r.entity="",r.state=c):g(r.entity.length?d:p,i)?r.entity+=i:(k(r,"Invalid character in entity name"),r[u]+="&"+r.entity+i,r.entity="",r.state=c);continue;default:throw new Error(r,"Unknown state: "+r.state)}return r.position>=r.bufferCheckPosition&&function(t){for(var r=Math.max(e.MAX_BUFFER_LENGTH,10),s=0,i=0,o=n.length;i<o;i++){var a=t[n[i]].length;if(a>r)switch(n[i]){case"textNode":S(t);break;case"cdata":A(t,"oncdata",t.cdata),t.cdata="";break;case"script":A(t,"onscript",t.script),t.script="";break;default:N(t,"Max buffer length exceeded: "+n[i])}s=Math.max(s,a)}var c=e.MAX_BUFFER_LENGTH-s;t.bufferCheckPosition=c+t.position}(r),r},resume:function(){return this.error=null,this},close:function(){return this.write(null)},flush:function(){var e;S(e=this),""!==e.cdata&&(A(e,"oncdata",e.cdata),e.cdata=""),""!==e.script&&(A(e,"onscript",e.script),e.script="")}};try{t=r(2830).Stream}catch(e){t=function(){}}var i=e.EVENTS.filter((function(e){return"error"!==e&&"end"!==e}));function o(e,r){if(!(this instanceof o))return new o(e,r);t.apply(this),this._parser=new s(e,r),this.writable=!0,this.readable=!0;var n=this;this._parser.onend=function(){n.emit("end")},this._parser.onerror=function(e){n.emit("error",e),n._parser.error=null},this._decoder=null,i.forEach((function(e){Object.defineProperty(n,"on"+e,{get:function(){return n._parser["on"+e]},set:function(t){if(!t)return n.removeAllListeners(e),n._parser["on"+e]=t,t;n.on(e,t)},enumerable:!0,configurable:!1})}))}o.prototype=Object.create(t.prototype,{constructor:{value:o}}),o.prototype.write=function(e){if("function"==typeof Buffer&&"function"==typeof Buffer.isBuffer&&Buffer.isBuffer(e)){if(!this._decoder){var t=r(2553).s;this._decoder=new t("utf8")}e=this._decoder.write(e)}return this._parser.write(e.toString()),this.emit("data",e),!0},o.prototype.end=function(e){return e&&e.length&&this.write(e),this._parser.end(),!0},o.prototype.on=function(e,r){var n=this;return n._parser["on"+e]||-1===i.indexOf(e)||(n._parser["on"+e]=function(){var t=1===arguments.length?[arguments[0]]:Array.apply(null,arguments);t.splice(0,0,e),n.emit.apply(n,t)}),t.prototype.on.call(n,e,r)};var a="http://www.w3.org/XML/1998/namespace",c="http://www.w3.org/2000/xmlns/",u={xml:a,xmlns:c},l=/[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/,h=/[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/,p=/[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/,d=/[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;function f(e){return" "===e||"\n"===e||"\r"===e||"\t"===e}function m(e){return'"'===e||"'"===e}function w(e){return">"===e||f(e)}function g(e,t){return e.test(t)}function y(e,t){return!g(e,t)}var b,v,x,_=0;for(var E in e.STATE={BEGIN:_++,BEGIN_WHITESPACE:_++,TEXT:_++,TEXT_ENTITY:_++,OPEN_WAKA:_++,SGML_DECL:_++,SGML_DECL_QUOTED:_++,DOCTYPE:_++,DOCTYPE_QUOTED:_++,DOCTYPE_DTD:_++,DOCTYPE_DTD_QUOTED:_++,COMMENT_STARTING:_++,COMMENT:_++,COMMENT_ENDING:_++,COMMENT_ENDED:_++,CDATA:_++,CDATA_ENDING:_++,CDATA_ENDING_2:_++,PROC_INST:_++,PROC_INST_BODY:_++,PROC_INST_ENDING:_++,OPEN_TAG:_++,OPEN_TAG_SLASH:_++,ATTRIB:_++,ATTRIB_NAME:_++,ATTRIB_NAME_SAW_WHITE:_++,ATTRIB_VALUE:_++,ATTRIB_VALUE_QUOTED:_++,ATTRIB_VALUE_CLOSED:_++,ATTRIB_VALUE_UNQUOTED:_++,ATTRIB_VALUE_ENTITY_Q:_++,ATTRIB_VALUE_ENTITY_U:_++,CLOSE_TAG:_++,CLOSE_TAG_SAW_WHITE:_++,SCRIPT:_++,SCRIPT_ENDING:_++},e.XML_ENTITIES={amp:"&",gt:">",lt:"<",quot:'"',apos:"'"},e.ENTITIES={amp:"&",gt:">",lt:"<",quot:'"',apos:"'",AElig:198,Aacute:193,Acirc:194,Agrave:192,Aring:197,Atilde:195,Auml:196,Ccedil:199,ETH:208,Eacute:201,Ecirc:202,Egrave:200,Euml:203,Iacute:205,Icirc:206,Igrave:204,Iuml:207,Ntilde:209,Oacute:211,Ocirc:212,Ograve:210,Oslash:216,Otilde:213,Ouml:214,THORN:222,Uacute:218,Ucirc:219,Ugrave:217,Uuml:220,Yacute:221,aacute:225,acirc:226,aelig:230,agrave:224,aring:229,atilde:227,auml:228,ccedil:231,eacute:233,ecirc:234,egrave:232,eth:240,euml:235,iacute:237,icirc:238,igrave:236,iuml:239,ntilde:241,oacute:243,ocirc:244,ograve:242,oslash:248,otilde:245,ouml:246,szlig:223,thorn:254,uacute:250,ucirc:251,ugrave:249,uuml:252,yacute:253,yuml:255,copy:169,reg:174,nbsp:160,iexcl:161,cent:162,pound:163,curren:164,yen:165,brvbar:166,sect:167,uml:168,ordf:170,laquo:171,not:172,shy:173,macr:175,deg:176,plusmn:177,sup1:185,sup2:178,sup3:179,acute:180,micro:181,para:182,middot:183,cedil:184,ordm:186,raquo:187,frac14:188,frac12:189,frac34:190,iquest:191,times:215,divide:247,OElig:338,oelig:339,Scaron:352,scaron:353,Yuml:376,fnof:402,circ:710,tilde:732,Alpha:913,Beta:914,Gamma:915,Delta:916,Epsilon:917,Zeta:918,Eta:919,Theta:920,Iota:921,Kappa:922,Lambda:923,Mu:924,Nu:925,Xi:926,Omicron:927,Pi:928,Rho:929,Sigma:931,Tau:932,Upsilon:933,Phi:934,Chi:935,Psi:936,Omega:937,alpha:945,beta:946,gamma:947,delta:948,epsilon:949,zeta:950,eta:951,theta:952,iota:953,kappa:954,lambda:955,mu:956,nu:957,xi:958,omicron:959,pi:960,rho:961,sigmaf:962,sigma:963,tau:964,upsilon:965,phi:966,chi:967,psi:968,omega:969,thetasym:977,upsih:978,piv:982,ensp:8194,emsp:8195,thinsp:8201,zwnj:8204,zwj:8205,lrm:8206,rlm:8207,ndash:8211,mdash:8212,lsquo:8216,rsquo:8217,sbquo:8218,ldquo:8220,rdquo:8221,bdquo:8222,dagger:8224,Dagger:8225,bull:8226,hellip:8230,permil:8240,prime:8242,Prime:8243,lsaquo:8249,rsaquo:8250,oline:8254,frasl:8260,euro:8364,image:8465,weierp:8472,real:8476,trade:8482,alefsym:8501,larr:8592,uarr:8593,rarr:8594,darr:8595,harr:8596,crarr:8629,lArr:8656,uArr:8657,rArr:8658,dArr:8659,hArr:8660,forall:8704,part:8706,exist:8707,empty:8709,nabla:8711,isin:8712,notin:8713,ni:8715,prod:8719,sum:8721,minus:8722,lowast:8727,radic:8730,prop:8733,infin:8734,ang:8736,and:8743,or:8744,cap:8745,cup:8746,int:8747,there4:8756,sim:8764,cong:8773,asymp:8776,ne:8800,equiv:8801,le:8804,ge:8805,sub:8834,sup:8835,nsub:8836,sube:8838,supe:8839,oplus:8853,otimes:8855,perp:8869,sdot:8901,lceil:8968,rceil:8969,lfloor:8970,rfloor:8971,lang:9001,rang:9002,loz:9674,spades:9824,clubs:9827,hearts:9829,diams:9830},Object.keys(e.ENTITIES).forEach((function(t){var r=e.ENTITIES[t],n="number"==typeof r?String.fromCharCode(r):r;e.ENTITIES[t]=n})),e.STATE)e.STATE[e.STATE[E]]=E;function T(e,t,r){e[t]&&e[t](r)}function A(e,t,r){e.textNode&&S(e),T(e,t,r)}function S(e){e.textNode=I(e.opt,e.textNode),e.textNode&&T(e,"ontext",e.textNode),e.textNode=""}function I(e,t){return e.trim&&(t=t.trim()),e.normalize&&(t=t.replace(/\s+/g," ")),t}function N(e,t){return S(e),e.trackPosition&&(t+="\nLine: "+e.line+"\nColumn: "+e.column+"\nChar: "+e.c),t=new Error(t),e.error=t,T(e,"onerror",t),e}function R(e){return e.sawRoot&&!e.closedRoot&&k(e,"Unclosed root tag"),e.state!==_.BEGIN&&e.state!==_.BEGIN_WHITESPACE&&e.state!==_.TEXT&&N(e,"Unexpected end"),S(e),e.c="",e.closed=!0,T(e,"onend"),s.call(e,e.strict,e.opt),e}function k(e,t){if("object"!=typeof e||!(e instanceof s))throw new Error("bad call to strictFail");e.strict&&N(e,t)}function C(e){e.strict||(e.tagName=e.tagName[e.looseCase]());var t=e.tags[e.tags.length-1]||e,r=e.tag={name:e.tagName,attributes:{}};e.opt.xmlns&&(r.ns=t.ns),e.attribList.length=0,A(e,"onopentagstart",r)}function O(e,t){var r=e.indexOf(":")<0?["",e]:e.split(":"),n=r[0],s=r[1];return t&&"xmlns"===e&&(n="xmlns",s=""),{prefix:n,local:s}}function L(e){if(e.strict||(e.attribName=e.attribName[e.looseCase]()),-1!==e.attribList.indexOf(e.attribName)||e.tag.attributes.hasOwnProperty(e.attribName))e.attribName=e.attribValue="";else{if(e.opt.xmlns){var t=O(e.attribName,!0),r=t.prefix,n=t.local;if("xmlns"===r)if("xml"===n&&e.attribValue!==a)k(e,"xml: prefix must be bound to "+a+"\nActual: "+e.attribValue);else if("xmlns"===n&&e.attribValue!==c)k(e,"xmlns: prefix must be bound to "+c+"\nActual: "+e.attribValue);else{var s=e.tag,i=e.tags[e.tags.length-1]||e;s.ns===i.ns&&(s.ns=Object.create(i.ns)),s.ns[n]=e.attribValue}e.attribList.push([e.attribName,e.attribValue])}else e.tag.attributes[e.attribName]=e.attribValue,A(e,"onattribute",{name:e.attribName,value:e.attribValue});e.attribName=e.attribValue=""}}function D(e,t){if(e.opt.xmlns){var r=e.tag,n=O(e.tagName);r.prefix=n.prefix,r.local=n.local,r.uri=r.ns[n.prefix]||"",r.prefix&&!r.uri&&(k(e,"Unbound namespace prefix: "+JSON.stringify(e.tagName)),r.uri=n.prefix);var s=e.tags[e.tags.length-1]||e;r.ns&&s.ns!==r.ns&&Object.keys(r.ns).forEach((function(t){A(e,"onopennamespace",{prefix:t,uri:r.ns[t]})}));for(var i=0,o=e.attribList.length;i<o;i++){var a=e.attribList[i],c=a[0],u=a[1],l=O(c,!0),h=l.prefix,p=l.local,d=""===h?"":r.ns[h]||"",f={name:c,value:u,prefix:h,local:p,uri:d};h&&"xmlns"!==h&&!d&&(k(e,"Unbound namespace prefix: "+JSON.stringify(h)),f.uri=h),e.tag.attributes[c]=f,A(e,"onattribute",f)}e.attribList.length=0}e.tag.isSelfClosing=!!t,e.sawRoot=!0,e.tags.push(e.tag),A(e,"onopentag",e.tag),t||(e.noscript||"script"!==e.tagName.toLowerCase()?e.state=_.TEXT:e.state=_.SCRIPT,e.tag=null,e.tagName=""),e.attribName=e.attribValue="",e.attribList.length=0}function P(e){if(!e.tagName)return k(e,"Weird empty close tag."),e.textNode+="</>",void(e.state=_.TEXT);if(e.script){if("script"!==e.tagName)return e.script+="</"+e.tagName+">",e.tagName="",void(e.state=_.SCRIPT);A(e,"onscript",e.script),e.script=""}var t=e.tags.length,r=e.tagName;e.strict||(r=r[e.looseCase]());for(var n=r;t--&&e.tags[t].name!==n;)k(e,"Unexpected close tag");if(t<0)return k(e,"Unmatched closing tag: "+e.tagName),e.textNode+="</"+e.tagName+">",void(e.state=_.TEXT);e.tagName=r;for(var s=e.tags.length;s-- >t;){var i=e.tag=e.tags.pop();e.tagName=e.tag.name,A(e,"onclosetag",e.tagName);var o={};for(var a in i.ns)o[a]=i.ns[a];var c=e.tags[e.tags.length-1]||e;e.opt.xmlns&&i.ns!==c.ns&&Object.keys(i.ns).forEach((function(t){var r=i.ns[t];A(e,"onclosenamespace",{prefix:t,uri:r})}))}0===t&&(e.closedRoot=!0),e.tagName=e.attribValue=e.attribName="",e.attribList.length=0,e.state=_.TEXT}function F(e){var t,r=e.entity,n=r.toLowerCase(),s="";return e.ENTITIES[r]?e.ENTITIES[r]:e.ENTITIES[n]?e.ENTITIES[n]:("#"===(r=n).charAt(0)&&("x"===r.charAt(1)?(r=r.slice(2),s=(t=parseInt(r,16)).toString(16)):(r=r.slice(1),s=(t=parseInt(r,10)).toString(10))),r=r.replace(/^0+/,""),isNaN(t)||s.toLowerCase()!==r?(k(e,"Invalid character entity"),"&"+e.entity+";"):String.fromCodePoint(t))}function B(e,t){"<"===t?(e.state=_.OPEN_WAKA,e.startTagPosition=e.position):f(t)||(k(e,"Non-whitespace before first tag."),e.textNode=t,e.state=_.TEXT)}function M(e,t){var r="";return t<e.length&&(r=e.charAt(t)),r}_=e.STATE,String.fromCodePoint||(b=String.fromCharCode,v=Math.floor,x=function(){var e,t,r=16384,n=[],s=-1,i=arguments.length;if(!i)return"";for(var o="";++s<i;){var a=Number(arguments[s]);if(!isFinite(a)||a<0||a>1114111||v(a)!==a)throw RangeError("Invalid code point: "+a);a<=65535?n.push(a):(e=55296+((a-=65536)>>10),t=a%1024+56320,n.push(e,t)),(s+1===i||n.length>r)&&(o+=b.apply(null,n),n.length=0)}return o},Object.defineProperty?Object.defineProperty(String,"fromCodePoint",{value:x,configurable:!0,writable:!0}):String.fromCodePoint=x)}(t)},4889:function(e,t,r){var n=r(4155);!function(e,t){"use strict";if(!e.setImmediate){var r,s,i,o,a,c=1,u={},l=!1,h=e.document,p=Object.getPrototypeOf&&Object.getPrototypeOf(e);p=p&&p.setTimeout?p:e,"[object process]"==={}.toString.call(e.process)?r=function(e){n.nextTick((function(){f(e)}))}:function(){if(e.postMessage&&!e.importScripts){var t=!0,r=e.onmessage;return e.onmessage=function(){t=!1},e.postMessage("","*"),e.onmessage=r,t}}()?(o="setImmediate$"+Math.random()+"$",a=function(t){t.source===e&&"string"==typeof t.data&&0===t.data.indexOf(o)&&f(+t.data.slice(o.length))},e.addEventListener?e.addEventListener("message",a,!1):e.attachEvent("onmessage",a),r=function(t){e.postMessage(o+t,"*")}):e.MessageChannel?((i=new MessageChannel).port1.onmessage=function(e){f(e.data)},r=function(e){i.port2.postMessage(e)}):h&&"onreadystatechange"in h.createElement("script")?(s=h.documentElement,r=function(e){var t=h.createElement("script");t.onreadystatechange=function(){f(e),t.onreadystatechange=null,s.removeChild(t),t=null},s.appendChild(t)}):r=function(e){setTimeout(f,0,e)},p.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),n=0;n<t.length;n++)t[n]=arguments[n+1];var s={callback:e,args:t};return u[c]=s,r(c),c++},p.clearImmediate=d}function d(e){delete u[e]}function f(e){if(l)setTimeout(f,0,e);else{var t=u[e];if(t){l=!0;try{!function(e){var t=e.callback,r=e.args;switch(r.length){case 0:t();break;case 1:t(r[0]);break;case 2:t(r[0],r[1]);break;case 3:t(r[0],r[1],r[2]);break;default:t.apply(void 0,r)}}(t)}finally{d(e),l=!1}}}}}("undefined"==typeof self?void 0===r.g?this:r.g:self)},2830:(e,t,r)=>{e.exports=s;var n=r(7187).EventEmitter;function s(){n.call(this)}r(5717)(s,n),s.Readable=r(6577),s.Writable=r(323),s.Duplex=r(8656),s.Transform=r(4473),s.PassThrough=r(2366),s.finished=r(1086),s.pipeline=r(6472),s.Stream=s,s.prototype.pipe=function(e,t){var r=this;function s(t){e.writable&&!1===e.write(t)&&r.pause&&r.pause()}function i(){r.readable&&r.resume&&r.resume()}r.on("data",s),e.on("drain",i),e._isStdio||t&&!1===t.end||(r.on("end",a),r.on("close",c));var o=!1;function a(){o||(o=!0,e.end())}function c(){o||(o=!0,"function"==typeof e.destroy&&e.destroy())}function u(e){if(l(),0===n.listenerCount(this,"error"))throw e}function l(){r.removeListener("data",s),e.removeListener("drain",i),r.removeListener("end",a),r.removeListener("close",c),r.removeListener("error",u),e.removeListener("error",u),r.removeListener("end",l),r.removeListener("close",l),e.removeListener("close",l)}return r.on("error",u),e.on("error",u),r.on("end",l),r.on("close",l),e.on("close",l),e.emit("pipe",r),e}},8106:e=>{"use strict";var t={};function r(e,r,n){n||(n=Error);var s=function(e){var t,n;function s(t,n,s){return e.call(this,function(e,t,n){return"string"==typeof r?r:r(e,t,n)}(t,n,s))||this}return n=e,(t=s).prototype=Object.create(n.prototype),t.prototype.constructor=t,t.__proto__=n,s}(n);s.prototype.name=n.name,s.prototype.code=e,t[e]=s}function n(e,t){if(Array.isArray(e)){var r=e.length;return e=e.map((function(e){return String(e)})),r>2?"one of ".concat(t," ").concat(e.slice(0,r-1).join(", "),", or ")+e[r-1]:2===r?"one of ".concat(t," ").concat(e[0]," or ").concat(e[1]):"of ".concat(t," ").concat(e[0])}return"of ".concat(t," ").concat(String(e))}r("ERR_INVALID_OPT_VALUE",(function(e,t){return'The value "'+t+'" is invalid for option "'+e+'"'}),TypeError),r("ERR_INVALID_ARG_TYPE",(function(e,t,r){var s,i,o,a,c;if("string"==typeof t&&(i="not ",t.substr(0,i.length)===i)?(s="must not be",t=t.replace(/^not /,"")):s="must be",function(e,t,r){return(void 0===r||r>e.length)&&(r=e.length),e.substring(r-t.length,r)===t}(e," argument"))o="The ".concat(e," ").concat(s," ").concat(n(t,"type"));else{var u=("number"!=typeof c&&(c=0),c+".".length>(a=e).length||-1===a.indexOf(".",c)?"argument":"property");o='The "'.concat(e,'" ').concat(u," ").concat(s," ").concat(n(t,"type"))}return o+". Received type ".concat(typeof r)}),TypeError),r("ERR_STREAM_PUSH_AFTER_EOF","stream.push() after EOF"),r("ERR_METHOD_NOT_IMPLEMENTED",(function(e){return"The "+e+" method is not implemented"})),r("ERR_STREAM_PREMATURE_CLOSE","Premature close"),r("ERR_STREAM_DESTROYED",(function(e){return"Cannot call "+e+" after a stream was destroyed"})),r("ERR_MULTIPLE_CALLBACK","Callback called multiple times"),r("ERR_STREAM_CANNOT_PIPE","Cannot pipe, not readable"),r("ERR_STREAM_WRITE_AFTER_END","write after end"),r("ERR_STREAM_NULL_VALUES","May not write null values to stream",TypeError),r("ERR_UNKNOWN_ENCODING",(function(e){return"Unknown encoding: "+e}),TypeError),r("ERR_STREAM_UNSHIFT_AFTER_END_EVENT","stream.unshift() after end event"),e.exports.q=t},8656:(e,t,r)=>{"use strict";var n=r(4155),s=Object.keys||function(e){var t=[];for(var r in e)t.push(r);return t};e.exports=l;var i=r(6577),o=r(323);r(5717)(l,i);for(var a=s(o.prototype),c=0;c<a.length;c++){var u=a[c];l.prototype[u]||(l.prototype[u]=o.prototype[u])}function l(e){if(!(this instanceof l))return new l(e);i.call(this,e),o.call(this,e),this.allowHalfOpen=!0,e&&(!1===e.readable&&(this.readable=!1),!1===e.writable&&(this.writable=!1),!1===e.allowHalfOpen&&(this.allowHalfOpen=!1,this.once("end",h)))}function h(){this._writableState.ended||n.nextTick(p,this)}function p(e){e.end()}Object.defineProperty(l.prototype,"writableHighWaterMark",{enumerable:!1,get:function(){return this._writableState.highWaterMark}}),Object.defineProperty(l.prototype,"writableBuffer",{enumerable:!1,get:function(){return this._writableState&&this._writableState.getBuffer()}}),Object.defineProperty(l.prototype,"writableLength",{enumerable:!1,get:function(){return this._writableState.length}}),Object.defineProperty(l.prototype,"destroyed",{enumerable:!1,get:function(){return void 0!==this._readableState&&void 0!==this._writableState&&this._readableState.destroyed&&this._writableState.destroyed},set:function(e){void 0!==this._readableState&&void 0!==this._writableState&&(this._readableState.destroyed=e,this._writableState.destroyed=e)}})},2366:(e,t,r)=>{"use strict";e.exports=s;var n=r(4473);function s(e){if(!(this instanceof s))return new s(e);n.call(this,e)}r(5717)(s,n),s.prototype._transform=function(e,t,r){r(null,e)}},6577:(e,t,r)=>{"use strict";var n,s=r(4155);e.exports=A,A.ReadableState=T,r(7187).EventEmitter;var i,o=function(e,t){return e.listeners(t).length},a=r(3194),c=r(8764).Buffer,u=r.g.Uint8Array||function(){},l=r(5575);i=l&&l.debuglog?l.debuglog("stream"):function(){};var h,p,d,f=r(9686),m=r(1029),w=r(94).getHighWaterMark,g=r(8106).q,y=g.ERR_INVALID_ARG_TYPE,b=g.ERR_STREAM_PUSH_AFTER_EOF,v=g.ERR_METHOD_NOT_IMPLEMENTED,x=g.ERR_STREAM_UNSHIFT_AFTER_END_EVENT;r(5717)(A,a);var _=m.errorOrDestroy,E=["error","close","destroy","pause","resume"];function T(e,t,s){n=n||r(8656),e=e||{},"boolean"!=typeof s&&(s=t instanceof n),this.objectMode=!!e.objectMode,s&&(this.objectMode=this.objectMode||!!e.readableObjectMode),this.highWaterMark=w(this,e,"readableHighWaterMark",s),this.buffer=new f,this.length=0,this.pipes=null,this.pipesCount=0,this.flowing=null,this.ended=!1,this.endEmitted=!1,this.reading=!1,this.sync=!0,this.needReadable=!1,this.emittedReadable=!1,this.readableListening=!1,this.resumeScheduled=!1,this.paused=!0,this.emitClose=!1!==e.emitClose,this.autoDestroy=!!e.autoDestroy,this.destroyed=!1,this.defaultEncoding=e.defaultEncoding||"utf8",this.awaitDrain=0,this.readingMore=!1,this.decoder=null,this.encoding=null,e.encoding&&(h||(h=r(2553).s),this.decoder=new h(e.encoding),this.encoding=e.encoding)}function A(e){if(n=n||r(8656),!(this instanceof A))return new A(e);var t=this instanceof n;this._readableState=new T(e,this,t),this.readable=!0,e&&("function"==typeof e.read&&(this._read=e.read),"function"==typeof e.destroy&&(this._destroy=e.destroy)),a.call(this)}function S(e,t,r,n,s){i("readableAddChunk",t);var o,a=e._readableState;if(null===t)a.reading=!1,function(e,t){if(i("onEofChunk"),!t.ended){if(t.decoder){var r=t.decoder.end();r&&r.length&&(t.buffer.push(r),t.length+=t.objectMode?1:r.length)}t.ended=!0,t.sync?k(e):(t.needReadable=!1,t.emittedReadable||(t.emittedReadable=!0,C(e)))}}(e,a);else if(s||(o=function(e,t){var r,n;return n=t,c.isBuffer(n)||n instanceof u||"string"==typeof t||void 0===t||e.objectMode||(r=new y("chunk",["string","Buffer","Uint8Array"],t)),r}(a,t)),o)_(e,o);else if(a.objectMode||t&&t.length>0)if("string"==typeof t||a.objectMode||Object.getPrototypeOf(t)===c.prototype||(t=function(e){return c.from(e)}(t)),n)a.endEmitted?_(e,new x):I(e,a,t,!0);else if(a.ended)_(e,new b);else{if(a.destroyed)return!1;a.reading=!1,a.decoder&&!r?(t=a.decoder.write(t),a.objectMode||0!==t.length?I(e,a,t,!1):O(e,a)):I(e,a,t,!1)}else n||(a.reading=!1,O(e,a));return!a.ended&&(a.length<a.highWaterMark||0===a.length)}function I(e,t,r,n){t.flowing&&0===t.length&&!t.sync?(t.awaitDrain=0,e.emit("data",r)):(t.length+=t.objectMode?1:r.length,n?t.buffer.unshift(r):t.buffer.push(r),t.needReadable&&k(e)),O(e,t)}Object.defineProperty(A.prototype,"destroyed",{enumerable:!1,get:function(){return void 0!==this._readableState&&this._readableState.destroyed},set:function(e){this._readableState&&(this._readableState.destroyed=e)}}),A.prototype.destroy=m.destroy,A.prototype._undestroy=m.undestroy,A.prototype._destroy=function(e,t){t(e)},A.prototype.push=function(e,t){var r,n=this._readableState;return n.objectMode?r=!0:"string"==typeof e&&((t=t||n.defaultEncoding)!==n.encoding&&(e=c.from(e,t),t=""),r=!0),S(this,e,t,!1,r)},A.prototype.unshift=function(e){return S(this,e,null,!0,!1)},A.prototype.isPaused=function(){return!1===this._readableState.flowing},A.prototype.setEncoding=function(e){h||(h=r(2553).s);var t=new h(e);this._readableState.decoder=t,this._readableState.encoding=this._readableState.decoder.encoding;for(var n=this._readableState.buffer.head,s="";null!==n;)s+=t.write(n.data),n=n.next;return this._readableState.buffer.clear(),""!==s&&this._readableState.buffer.push(s),this._readableState.length=s.length,this};var N=1073741824;function R(e,t){return e<=0||0===t.length&&t.ended?0:t.objectMode?1:e!=e?t.flowing&&t.length?t.buffer.head.data.length:t.length:(e>t.highWaterMark&&(t.highWaterMark=function(e){return e>=N?e=N:(e--,e|=e>>>1,e|=e>>>2,e|=e>>>4,e|=e>>>8,e|=e>>>16,e++),e}(e)),e<=t.length?e:t.ended?t.length:(t.needReadable=!0,0))}function k(e){var t=e._readableState;i("emitReadable",t.needReadable,t.emittedReadable),t.needReadable=!1,t.emittedReadable||(i("emitReadable",t.flowing),t.emittedReadable=!0,s.nextTick(C,e))}function C(e){var t=e._readableState;i("emitReadable_",t.destroyed,t.length,t.ended),t.destroyed||!t.length&&!t.ended||(e.emit("readable"),t.emittedReadable=!1),t.needReadable=!t.flowing&&!t.ended&&t.length<=t.highWaterMark,B(e)}function O(e,t){t.readingMore||(t.readingMore=!0,s.nextTick(L,e,t))}function L(e,t){for(;!t.reading&&!t.ended&&(t.length<t.highWaterMark||t.flowing&&0===t.length);){var r=t.length;if(i("maybeReadMore read 0"),e.read(0),r===t.length)break}t.readingMore=!1}function D(e){var t=e._readableState;t.readableListening=e.listenerCount("readable")>0,t.resumeScheduled&&!t.paused?t.flowing=!0:e.listenerCount("data")>0&&e.resume()}function P(e){i("readable nexttick read 0"),e.read(0)}function F(e,t){i("resume",t.reading),t.reading||e.read(0),t.resumeScheduled=!1,e.emit("resume"),B(e),t.flowing&&!t.reading&&e.read(0)}function B(e){var t=e._readableState;for(i("flow",t.flowing);t.flowing&&null!==e.read(););}function M(e,t){return 0===t.length?null:(t.objectMode?r=t.buffer.shift():!e||e>=t.length?(r=t.decoder?t.buffer.join(""):1===t.buffer.length?t.buffer.first():t.buffer.concat(t.length),t.buffer.clear()):r=t.buffer.consume(e,t.decoder),r);var r}function U(e){var t=e._readableState;i("endReadable",t.endEmitted),t.endEmitted||(t.ended=!0,s.nextTick(H,t,e))}function H(e,t){if(i("endReadableNT",e.endEmitted,e.length),!e.endEmitted&&0===e.length&&(e.endEmitted=!0,t.readable=!1,t.emit("end"),e.autoDestroy)){var r=t._writableState;(!r||r.autoDestroy&&r.finished)&&t.destroy()}}function j(e,t){for(var r=0,n=e.length;r<n;r++)if(e[r]===t)return r;return-1}A.prototype.read=function(e){i("read",e),e=parseInt(e,10);var t=this._readableState,r=e;if(0!==e&&(t.emittedReadable=!1),0===e&&t.needReadable&&((0!==t.highWaterMark?t.length>=t.highWaterMark:t.length>0)||t.ended))return i("read: emitReadable",t.length,t.ended),0===t.length&&t.ended?U(this):k(this),null;if(0===(e=R(e,t))&&t.ended)return 0===t.length&&U(this),null;var n,s=t.needReadable;return i("need readable",s),(0===t.length||t.length-e<t.highWaterMark)&&i("length less than watermark",s=!0),t.ended||t.reading?i("reading or ended",s=!1):s&&(i("do read"),t.reading=!0,t.sync=!0,0===t.length&&(t.needReadable=!0),this._read(t.highWaterMark),t.sync=!1,t.reading||(e=R(r,t))),null===(n=e>0?M(e,t):null)?(t.needReadable=t.length<=t.highWaterMark,e=0):(t.length-=e,t.awaitDrain=0),0===t.length&&(t.ended||(t.needReadable=!0),r!==e&&t.ended&&U(this)),null!==n&&this.emit("data",n),n},A.prototype._read=function(e){_(this,new v("_read()"))},A.prototype.pipe=function(e,t){var r=this,n=this._readableState;switch(n.pipesCount){case 0:n.pipes=e;break;case 1:n.pipes=[n.pipes,e];break;default:n.pipes.push(e)}n.pipesCount+=1,i("pipe count=%d opts=%j",n.pipesCount,t);var a=t&&!1===t.end||e===s.stdout||e===s.stderr?m:c;function c(){i("onend"),e.end()}n.endEmitted?s.nextTick(a):r.once("end",a),e.on("unpipe",(function t(s,o){i("onunpipe"),s===r&&o&&!1===o.hasUnpiped&&(o.hasUnpiped=!0,i("cleanup"),e.removeListener("close",d),e.removeListener("finish",f),e.removeListener("drain",u),e.removeListener("error",p),e.removeListener("unpipe",t),r.removeListener("end",c),r.removeListener("end",m),r.removeListener("data",h),l=!0,!n.awaitDrain||e._writableState&&!e._writableState.needDrain||u())}));var u=function(e){return function(){var t=e._readableState;i("pipeOnDrain",t.awaitDrain),t.awaitDrain&&t.awaitDrain--,0===t.awaitDrain&&o(e,"data")&&(t.flowing=!0,B(e))}}(r);e.on("drain",u);var l=!1;function h(t){i("ondata");var s=e.write(t);i("dest.write",s),!1===s&&((1===n.pipesCount&&n.pipes===e||n.pipesCount>1&&-1!==j(n.pipes,e))&&!l&&(i("false write response, pause",n.awaitDrain),n.awaitDrain++),r.pause())}function p(t){i("onerror",t),m(),e.removeListener("error",p),0===o(e,"error")&&_(e,t)}function d(){e.removeListener("finish",f),m()}function f(){i("onfinish"),e.removeListener("close",d),m()}function m(){i("unpipe"),r.unpipe(e)}return r.on("data",h),function(e,t,r){if("function"==typeof e.prependListener)return e.prependListener(t,r);e._events&&e._events.error?Array.isArray(e._events.error)?e._events.error.unshift(r):e._events.error=[r,e._events.error]:e.on(t,r)}(e,"error",p),e.once("close",d),e.once("finish",f),e.emit("pipe",r),n.flowing||(i("pipe resume"),r.resume()),e},A.prototype.unpipe=function(e){var t=this._readableState,r={hasUnpiped:!1};if(0===t.pipesCount)return this;if(1===t.pipesCount)return e&&e!==t.pipes||(e||(e=t.pipes),t.pipes=null,t.pipesCount=0,t.flowing=!1,e&&e.emit("unpipe",this,r)),this;if(!e){var n=t.pipes,s=t.pipesCount;t.pipes=null,t.pipesCount=0,t.flowing=!1;for(var i=0;i<s;i++)n[i].emit("unpipe",this,{hasUnpiped:!1});return this}var o=j(t.pipes,e);return-1===o||(t.pipes.splice(o,1),t.pipesCount-=1,1===t.pipesCount&&(t.pipes=t.pipes[0]),e.emit("unpipe",this,r)),this},A.prototype.on=function(e,t){var r=a.prototype.on.call(this,e,t),n=this._readableState;return"data"===e?(n.readableListening=this.listenerCount("readable")>0,!1!==n.flowing&&this.resume()):"readable"===e&&(n.endEmitted||n.readableListening||(n.readableListening=n.needReadable=!0,n.flowing=!1,n.emittedReadable=!1,i("on readable",n.length,n.reading),n.length?k(this):n.reading||s.nextTick(P,this))),r},A.prototype.addListener=A.prototype.on,A.prototype.removeListener=function(e,t){var r=a.prototype.removeListener.call(this,e,t);return"readable"===e&&s.nextTick(D,this),r},A.prototype.removeAllListeners=function(e){var t=a.prototype.removeAllListeners.apply(this,arguments);return"readable"!==e&&void 0!==e||s.nextTick(D,this),t},A.prototype.resume=function(){var e=this._readableState;return e.flowing||(i("resume"),e.flowing=!e.readableListening,function(e,t){t.resumeScheduled||(t.resumeScheduled=!0,s.nextTick(F,e,t))}(this,e)),e.paused=!1,this},A.prototype.pause=function(){return i("call pause flowing=%j",this._readableState.flowing),!1!==this._readableState.flowing&&(i("pause"),this._readableState.flowing=!1,this.emit("pause")),this._readableState.paused=!0,this},A.prototype.wrap=function(e){var t=this,r=this._readableState,n=!1;for(var s in e.on("end",(function(){if(i("wrapped end"),r.decoder&&!r.ended){var e=r.decoder.end();e&&e.length&&t.push(e)}t.push(null)})),e.on("data",(function(s){i("wrapped data"),r.decoder&&(s=r.decoder.write(s)),r.objectMode&&null==s||(r.objectMode||s&&s.length)&&(t.push(s)||(n=!0,e.pause()))})),e)void 0===this[s]&&"function"==typeof e[s]&&(this[s]=function(t){return function(){return e[t].apply(e,arguments)}}(s));for(var o=0;o<E.length;o++)e.on(E[o],this.emit.bind(this,E[o]));return this._read=function(t){i("wrapped _read",t),n&&(n=!1,e.resume())},this},"function"==typeof Symbol&&(A.prototype[Symbol.asyncIterator]=function(){return void 0===p&&(p=r(828)),p(this)}),Object.defineProperty(A.prototype,"readableHighWaterMark",{enumerable:!1,get:function(){return this._readableState.highWaterMark}}),Object.defineProperty(A.prototype,"readableBuffer",{enumerable:!1,get:function(){return this._readableState&&this._readableState.buffer}}),Object.defineProperty(A.prototype,"readableFlowing",{enumerable:!1,get:function(){return this._readableState.flowing},set:function(e){this._readableState&&(this._readableState.flowing=e)}}),A._fromList=M,Object.defineProperty(A.prototype,"readableLength",{enumerable:!1,get:function(){return this._readableState.length}}),"function"==typeof Symbol&&(A.from=function(e,t){return void 0===d&&(d=r(1265)),d(A,e,t)})},4473:(e,t,r)=>{"use strict";e.exports=l;var n=r(8106).q,s=n.ERR_METHOD_NOT_IMPLEMENTED,i=n.ERR_MULTIPLE_CALLBACK,o=n.ERR_TRANSFORM_ALREADY_TRANSFORMING,a=n.ERR_TRANSFORM_WITH_LENGTH_0,c=r(8656);function u(e,t){var r=this._transformState;r.transforming=!1;var n=r.writecb;if(null===n)return this.emit("error",new i);r.writechunk=null,r.writecb=null,null!=t&&this.push(t),n(e);var s=this._readableState;s.reading=!1,(s.needReadable||s.length<s.highWaterMark)&&this._read(s.highWaterMark)}function l(e){if(!(this instanceof l))return new l(e);c.call(this,e),this._transformState={afterTransform:u.bind(this),needTransform:!1,transforming:!1,writecb:null,writechunk:null,writeencoding:null},this._readableState.needReadable=!0,this._readableState.sync=!1,e&&("function"==typeof e.transform&&(this._transform=e.transform),"function"==typeof e.flush&&(this._flush=e.flush)),this.on("prefinish",h)}function h(){var e=this;"function"!=typeof this._flush||this._readableState.destroyed?p(this,null,null):this._flush((function(t,r){p(e,t,r)}))}function p(e,t,r){if(t)return e.emit("error",t);if(null!=r&&e.push(r),e._writableState.length)throw new a;if(e._transformState.transforming)throw new o;return e.push(null)}r(5717)(l,c),l.prototype.push=function(e,t){return this._transformState.needTransform=!1,c.prototype.push.call(this,e,t)},l.prototype._transform=function(e,t,r){r(new s("_transform()"))},l.prototype._write=function(e,t,r){var n=this._transformState;if(n.writecb=r,n.writechunk=e,n.writeencoding=t,!n.transforming){var s=this._readableState;(n.needTransform||s.needReadable||s.length<s.highWaterMark)&&this._read(s.highWaterMark)}},l.prototype._read=function(e){var t=this._transformState;null===t.writechunk||t.transforming?t.needTransform=!0:(t.transforming=!0,this._transform(t.writechunk,t.writeencoding,t.afterTransform))},l.prototype._destroy=function(e,t){c.prototype._destroy.call(this,e,(function(e){t(e)}))}},323:(e,t,r)=>{"use strict";var n,s=r(4155);function i(e){var t=this;this.next=null,this.entry=null,this.finish=function(){!function(e,t,r){var n=e.entry;for(e.entry=null;n;){var s=n.callback;t.pendingcb--,s(undefined),n=n.next}t.corkedRequestsFree.next=e}(t,e)}}e.exports=A,A.WritableState=T;var o,a={deprecate:r(4927)},c=r(3194),u=r(8764).Buffer,l=r.g.Uint8Array||function(){},h=r(1029),p=r(94).getHighWaterMark,d=r(8106).q,f=d.ERR_INVALID_ARG_TYPE,m=d.ERR_METHOD_NOT_IMPLEMENTED,w=d.ERR_MULTIPLE_CALLBACK,g=d.ERR_STREAM_CANNOT_PIPE,y=d.ERR_STREAM_DESTROYED,b=d.ERR_STREAM_NULL_VALUES,v=d.ERR_STREAM_WRITE_AFTER_END,x=d.ERR_UNKNOWN_ENCODING,_=h.errorOrDestroy;function E(){}function T(e,t,o){n=n||r(8656),e=e||{},"boolean"!=typeof o&&(o=t instanceof n),this.objectMode=!!e.objectMode,o&&(this.objectMode=this.objectMode||!!e.writableObjectMode),this.highWaterMark=p(this,e,"writableHighWaterMark",o),this.finalCalled=!1,this.needDrain=!1,this.ending=!1,this.ended=!1,this.finished=!1,this.destroyed=!1;var a=!1===e.decodeStrings;this.decodeStrings=!a,this.defaultEncoding=e.defaultEncoding||"utf8",this.length=0,this.writing=!1,this.corked=0,this.sync=!0,this.bufferProcessing=!1,this.onwrite=function(e){!function(e,t){var r=e._writableState,n=r.sync,i=r.writecb;if("function"!=typeof i)throw new w;if(function(e){e.writing=!1,e.writecb=null,e.length-=e.writelen,e.writelen=0}(r),t)!function(e,t,r,n,i){--t.pendingcb,r?(s.nextTick(i,n),s.nextTick(C,e,t),e._writableState.errorEmitted=!0,_(e,n)):(i(n),e._writableState.errorEmitted=!0,_(e,n),C(e,t))}(e,r,n,t,i);else{var o=R(r)||e.destroyed;o||r.corked||r.bufferProcessing||!r.bufferedRequest||N(e,r),n?s.nextTick(I,e,r,o,i):I(e,r,o,i)}}(t,e)},this.writecb=null,this.writelen=0,this.bufferedRequest=null,this.lastBufferedRequest=null,this.pendingcb=0,this.prefinished=!1,this.errorEmitted=!1,this.emitClose=!1!==e.emitClose,this.autoDestroy=!!e.autoDestroy,this.bufferedRequestCount=0,this.corkedRequestsFree=new i(this)}function A(e){var t=this instanceof(n=n||r(8656));if(!t&&!o.call(A,this))return new A(e);this._writableState=new T(e,this,t),this.writable=!0,e&&("function"==typeof e.write&&(this._write=e.write),"function"==typeof e.writev&&(this._writev=e.writev),"function"==typeof e.destroy&&(this._destroy=e.destroy),"function"==typeof e.final&&(this._final=e.final)),c.call(this)}function S(e,t,r,n,s,i,o){t.writelen=n,t.writecb=o,t.writing=!0,t.sync=!0,t.destroyed?t.onwrite(new y("write")):r?e._writev(s,t.onwrite):e._write(s,i,t.onwrite),t.sync=!1}function I(e,t,r,n){r||function(e,t){0===t.length&&t.needDrain&&(t.needDrain=!1,e.emit("drain"))}(e,t),t.pendingcb--,n(),C(e,t)}function N(e,t){t.bufferProcessing=!0;var r=t.bufferedRequest;if(e._writev&&r&&r.next){var n=t.bufferedRequestCount,s=new Array(n),o=t.corkedRequestsFree;o.entry=r;for(var a=0,c=!0;r;)s[a]=r,r.isBuf||(c=!1),r=r.next,a+=1;s.allBuffers=c,S(e,t,!0,t.length,s,"",o.finish),t.pendingcb++,t.lastBufferedRequest=null,o.next?(t.corkedRequestsFree=o.next,o.next=null):t.corkedRequestsFree=new i(t),t.bufferedRequestCount=0}else{for(;r;){var u=r.chunk,l=r.encoding,h=r.callback;if(S(e,t,!1,t.objectMode?1:u.length,u,l,h),r=r.next,t.bufferedRequestCount--,t.writing)break}null===r&&(t.lastBufferedRequest=null)}t.bufferedRequest=r,t.bufferProcessing=!1}function R(e){return e.ending&&0===e.length&&null===e.bufferedRequest&&!e.finished&&!e.writing}function k(e,t){e._final((function(r){t.pendingcb--,r&&_(e,r),t.prefinished=!0,e.emit("prefinish"),C(e,t)}))}function C(e,t){var r=R(t);if(r&&(function(e,t){t.prefinished||t.finalCalled||("function"!=typeof e._final||t.destroyed?(t.prefinished=!0,e.emit("prefinish")):(t.pendingcb++,t.finalCalled=!0,s.nextTick(k,e,t)))}(e,t),0===t.pendingcb&&(t.finished=!0,e.emit("finish"),t.autoDestroy))){var n=e._readableState;(!n||n.autoDestroy&&n.endEmitted)&&e.destroy()}return r}r(5717)(A,c),T.prototype.getBuffer=function(){for(var e=this.bufferedRequest,t=[];e;)t.push(e),e=e.next;return t},function(){try{Object.defineProperty(T.prototype,"buffer",{get:a.deprecate((function(){return this.getBuffer()}),"_writableState.buffer is deprecated. Use _writableState.getBuffer instead.","DEP0003")})}catch(e){}}(),"function"==typeof Symbol&&Symbol.hasInstance&&"function"==typeof Function.prototype[Symbol.hasInstance]?(o=Function.prototype[Symbol.hasInstance],Object.defineProperty(A,Symbol.hasInstance,{value:function(e){return!!o.call(this,e)||this===A&&e&&e._writableState instanceof T}})):o=function(e){return e instanceof this},A.prototype.pipe=function(){_(this,new g)},A.prototype.write=function(e,t,r){var n,i=this._writableState,o=!1,a=!i.objectMode&&(n=e,u.isBuffer(n)||n instanceof l);return a&&!u.isBuffer(e)&&(e=function(e){return u.from(e)}(e)),"function"==typeof t&&(r=t,t=null),a?t="buffer":t||(t=i.defaultEncoding),"function"!=typeof r&&(r=E),i.ending?function(e,t){var r=new v;_(e,r),s.nextTick(t,r)}(this,r):(a||function(e,t,r,n){var i;return null===r?i=new b:"string"==typeof r||t.objectMode||(i=new f("chunk",["string","Buffer"],r)),!i||(_(e,i),s.nextTick(n,i),!1)}(this,i,e,r))&&(i.pendingcb++,o=function(e,t,r,n,s,i){if(!r){var o=function(e,t,r){return e.objectMode||!1===e.decodeStrings||"string"!=typeof t||(t=u.from(t,r)),t}(t,n,s);n!==o&&(r=!0,s="buffer",n=o)}var a=t.objectMode?1:n.length;t.length+=a;var c=t.length<t.highWaterMark;if(c||(t.needDrain=!0),t.writing||t.corked){var l=t.lastBufferedRequest;t.lastBufferedRequest={chunk:n,encoding:s,isBuf:r,callback:i,next:null},l?l.next=t.lastBufferedRequest:t.bufferedRequest=t.lastBufferedRequest,t.bufferedRequestCount+=1}else S(e,t,!1,a,n,s,i);return c}(this,i,a,e,t,r)),o},A.prototype.cork=function(){this._writableState.corked++},A.prototype.uncork=function(){var e=this._writableState;e.corked&&(e.corked--,e.writing||e.corked||e.bufferProcessing||!e.bufferedRequest||N(this,e))},A.prototype.setDefaultEncoding=function(e){if("string"==typeof e&&(e=e.toLowerCase()),!(["hex","utf8","utf-8","ascii","binary","base64","ucs2","ucs-2","utf16le","utf-16le","raw"].indexOf((e+"").toLowerCase())>-1))throw new x(e);return this._writableState.defaultEncoding=e,this},Object.defineProperty(A.prototype,"writableBuffer",{enumerable:!1,get:function(){return this._writableState&&this._writableState.getBuffer()}}),Object.defineProperty(A.prototype,"writableHighWaterMark",{enumerable:!1,get:function(){return this._writableState.highWaterMark}}),A.prototype._write=function(e,t,r){r(new m("_write()"))},A.prototype._writev=null,A.prototype.end=function(e,t,r){var n=this._writableState;return"function"==typeof e?(r=e,e=null,t=null):"function"==typeof t&&(r=t,t=null),null!=e&&this.write(e,t),n.corked&&(n.corked=1,this.uncork()),n.ending||function(e,t,r){t.ending=!0,C(e,t),r&&(t.finished?s.nextTick(r):e.once("finish",r)),t.ended=!0,e.writable=!1}(this,n,r),this},Object.defineProperty(A.prototype,"writableLength",{enumerable:!1,get:function(){return this._writableState.length}}),Object.defineProperty(A.prototype,"destroyed",{enumerable:!1,get:function(){return void 0!==this._writableState&&this._writableState.destroyed},set:function(e){this._writableState&&(this._writableState.destroyed=e)}}),A.prototype.destroy=h.destroy,A.prototype._undestroy=h.undestroy,A.prototype._destroy=function(e,t){t(e)}},828:(e,t,r)=>{"use strict";var n,s=r(4155);function i(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}var o=r(1086),a=Symbol("lastResolve"),c=Symbol("lastReject"),u=Symbol("error"),l=Symbol("ended"),h=Symbol("lastPromise"),p=Symbol("handlePromise"),d=Symbol("stream");function f(e,t){return{value:e,done:t}}function m(e){var t=e[a];if(null!==t){var r=e[d].read();null!==r&&(e[h]=null,e[a]=null,e[c]=null,t(f(r,!1)))}}function w(e){s.nextTick(m,e)}var g=Object.getPrototypeOf((function(){})),y=Object.setPrototypeOf((i(n={get stream(){return this[d]},next:function(){var e=this,t=this[u];if(null!==t)return Promise.reject(t);if(this[l])return Promise.resolve(f(void 0,!0));if(this[d].destroyed)return new Promise((function(t,r){s.nextTick((function(){e[u]?r(e[u]):t(f(void 0,!0))}))}));var r,n=this[h];if(n)r=new Promise(function(e,t){return function(r,n){e.then((function(){t[l]?r(f(void 0,!0)):t[p](r,n)}),n)}}(n,this));else{var i=this[d].read();if(null!==i)return Promise.resolve(f(i,!1));r=new Promise(this[p])}return this[h]=r,r}},Symbol.asyncIterator,(function(){return this})),i(n,"return",(function(){var e=this;return new Promise((function(t,r){e[d].destroy(null,(function(e){e?r(e):t(f(void 0,!0))}))}))})),n),g);e.exports=function(e){var t,r=Object.create(y,(i(t={},d,{value:e,writable:!0}),i(t,a,{value:null,writable:!0}),i(t,c,{value:null,writable:!0}),i(t,u,{value:null,writable:!0}),i(t,l,{value:e._readableState.endEmitted,writable:!0}),i(t,p,{value:function(e,t){var n=r[d].read();n?(r[h]=null,r[a]=null,r[c]=null,e(f(n,!1))):(r[a]=e,r[c]=t)},writable:!0}),t));return r[h]=null,o(e,(function(e){if(e&&"ERR_STREAM_PREMATURE_CLOSE"!==e.code){var t=r[c];return null!==t&&(r[h]=null,r[a]=null,r[c]=null,t(e)),void(r[u]=e)}var n=r[a];null!==n&&(r[h]=null,r[a]=null,r[c]=null,n(f(void 0,!0))),r[l]=!0})),e.on("readable",w.bind(null,r)),r}},9686:(e,t,r)=>{"use strict";function n(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function s(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function i(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}var o=r(8764).Buffer,a=r(5575).inspect,c=a&&a.custom||"inspect";e.exports=function(){function e(){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.head=null,this.tail=null,this.length=0}var t,r;return t=e,r=[{key:"push",value:function(e){var t={data:e,next:null};this.length>0?this.tail.next=t:this.head=t,this.tail=t,++this.length}},{key:"unshift",value:function(e){var t={data:e,next:this.head};0===this.length&&(this.tail=t),this.head=t,++this.length}},{key:"shift",value:function(){if(0!==this.length){var e=this.head.data;return 1===this.length?this.head=this.tail=null:this.head=this.head.next,--this.length,e}}},{key:"clear",value:function(){this.head=this.tail=null,this.length=0}},{key:"join",value:function(e){if(0===this.length)return"";for(var t=this.head,r=""+t.data;t=t.next;)r+=e+t.data;return r}},{key:"concat",value:function(e){if(0===this.length)return o.alloc(0);for(var t,r,n,s=o.allocUnsafe(e>>>0),i=this.head,a=0;i;)t=i.data,r=s,n=a,o.prototype.copy.call(t,r,n),a+=i.data.length,i=i.next;return s}},{key:"consume",value:function(e,t){var r;return e<this.head.data.length?(r=this.head.data.slice(0,e),this.head.data=this.head.data.slice(e)):r=e===this.head.data.length?this.shift():t?this._getString(e):this._getBuffer(e),r}},{key:"first",value:function(){return this.head.data}},{key:"_getString",value:function(e){var t=this.head,r=1,n=t.data;for(e-=n.length;t=t.next;){var s=t.data,i=e>s.length?s.length:e;if(i===s.length?n+=s:n+=s.slice(0,e),0==(e-=i)){i===s.length?(++r,t.next?this.head=t.next:this.head=this.tail=null):(this.head=t,t.data=s.slice(i));break}++r}return this.length-=r,n}},{key:"_getBuffer",value:function(e){var t=o.allocUnsafe(e),r=this.head,n=1;for(r.data.copy(t),e-=r.data.length;r=r.next;){var s=r.data,i=e>s.length?s.length:e;if(s.copy(t,t.length-e,0,i),0==(e-=i)){i===s.length?(++n,r.next?this.head=r.next:this.head=this.tail=null):(this.head=r,r.data=s.slice(i));break}++n}return this.length-=n,t}},{key:c,value:function(e,t){return a(this,function(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?n(Object(r),!0).forEach((function(t){s(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):n(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}({},t,{depth:0,customInspect:!1}))}}],r&&i(t.prototype,r),e}()},1029:(e,t,r)=>{"use strict";var n=r(4155);function s(e,t){o(e,t),i(e)}function i(e){e._writableState&&!e._writableState.emitClose||e._readableState&&!e._readableState.emitClose||e.emit("close")}function o(e,t){e.emit("error",t)}e.exports={destroy:function(e,t){var r=this,a=this._readableState&&this._readableState.destroyed,c=this._writableState&&this._writableState.destroyed;return a||c?(t?t(e):e&&(this._writableState?this._writableState.errorEmitted||(this._writableState.errorEmitted=!0,n.nextTick(o,this,e)):n.nextTick(o,this,e)),this):(this._readableState&&(this._readableState.destroyed=!0),this._writableState&&(this._writableState.destroyed=!0),this._destroy(e||null,(function(e){!t&&e?r._writableState?r._writableState.errorEmitted?n.nextTick(i,r):(r._writableState.errorEmitted=!0,n.nextTick(s,r,e)):n.nextTick(s,r,e):t?(n.nextTick(i,r),t(e)):n.nextTick(i,r)})),this)},undestroy:function(){this._readableState&&(this._readableState.destroyed=!1,this._readableState.reading=!1,this._readableState.ended=!1,this._readableState.endEmitted=!1),this._writableState&&(this._writableState.destroyed=!1,this._writableState.ended=!1,this._writableState.ending=!1,this._writableState.finalCalled=!1,this._writableState.prefinished=!1,this._writableState.finished=!1,this._writableState.errorEmitted=!1)},errorOrDestroy:function(e,t){var r=e._readableState,n=e._writableState;r&&r.autoDestroy||n&&n.autoDestroy?e.destroy(t):e.emit("error",t)}}},1086:(e,t,r)=>{"use strict";var n=r(8106).q.ERR_STREAM_PREMATURE_CLOSE;function s(){}e.exports=function e(t,r,i){if("function"==typeof r)return e(t,null,r);r||(r={}),i=function(e){var t=!1;return function(){if(!t){t=!0;for(var r=arguments.length,n=new Array(r),s=0;s<r;s++)n[s]=arguments[s];e.apply(this,n)}}}(i||s);var o=r.readable||!1!==r.readable&&t.readable,a=r.writable||!1!==r.writable&&t.writable,c=function(){t.writable||l()},u=t._writableState&&t._writableState.finished,l=function(){a=!1,u=!0,o||i.call(t)},h=t._readableState&&t._readableState.endEmitted,p=function(){o=!1,h=!0,a||i.call(t)},d=function(e){i.call(t,e)},f=function(){var e;return o&&!h?(t._readableState&&t._readableState.ended||(e=new n),i.call(t,e)):a&&!u?(t._writableState&&t._writableState.ended||(e=new n),i.call(t,e)):void 0},m=function(){t.req.on("finish",l)};return function(e){return e.setHeader&&"function"==typeof e.abort}(t)?(t.on("complete",l),t.on("abort",f),t.req?m():t.on("request",m)):a&&!t._writableState&&(t.on("end",c),t.on("close",c)),t.on("end",p),t.on("finish",l),!1!==r.error&&t.on("error",d),t.on("close",f),function(){t.removeListener("complete",l),t.removeListener("abort",f),t.removeListener("request",m),t.req&&t.req.removeListener("finish",l),t.removeListener("end",c),t.removeListener("close",c),t.removeListener("finish",l),t.removeListener("end",p),t.removeListener("error",d),t.removeListener("close",f)}}},1265:e=>{e.exports=function(){throw new Error("Readable.from is not available in the browser")}},6472:(e,t,r)=>{"use strict";var n,s=r(8106).q,i=s.ERR_MISSING_ARGS,o=s.ERR_STREAM_DESTROYED;function a(e){if(e)throw e}function c(e,t,s,i){i=function(e){var t=!1;return function(){t||(t=!0,e.apply(void 0,arguments))}}(i);var a=!1;e.on("close",(function(){a=!0})),void 0===n&&(n=r(1086)),n(e,{readable:t,writable:s},(function(e){if(e)return i(e);a=!0,i()}));var c=!1;return function(t){if(!a&&!c)return c=!0,function(e){return e.setHeader&&"function"==typeof e.abort}(e)?e.abort():"function"==typeof e.destroy?e.destroy():void i(t||new o("pipe"))}}function u(e){e()}function l(e,t){return e.pipe(t)}function h(e){return e.length?"function"!=typeof e[e.length-1]?a:e.pop():a}e.exports=function(){for(var e=arguments.length,t=new Array(e),r=0;r<e;r++)t[r]=arguments[r];var n,s=h(t);if(Array.isArray(t[0])&&(t=t[0]),t.length<2)throw new i("streams");var o=t.map((function(e,r){var i=r<t.length-1;return c(e,i,r>0,(function(e){n||(n=e),e&&o.forEach(u),i||(o.forEach(u),s(n))}))}));return t.reduce(l)}},94:(e,t,r)=>{"use strict";var n=r(8106).q.ERR_INVALID_OPT_VALUE;e.exports={getHighWaterMark:function(e,t,r,s){var i=function(e,t,r){return null!=e.highWaterMark?e.highWaterMark:t?e[r]:null}(t,s,r);if(null!=i){if(!isFinite(i)||Math.floor(i)!==i||i<0)throw new n(s?r:"highWaterMark",i);return Math.floor(i)}return e.objectMode?16:16384}}},3194:(e,t,r)=>{e.exports=r(7187).EventEmitter},2553:(e,t,r)=>{"use strict";var n=r(9509).Buffer,s=n.isEncoding||function(e){switch((e=""+e)&&e.toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":case"raw":return!0;default:return!1}};function i(e){var t;switch(this.encoding=function(e){var t=function(e){if(!e)return"utf8";for(var t;;)switch(e){case"utf8":case"utf-8":return"utf8";case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return"utf16le";case"latin1":case"binary":return"latin1";case"base64":case"ascii":case"hex":return e;default:if(t)return;e=(""+e).toLowerCase(),t=!0}}(e);if("string"!=typeof t&&(n.isEncoding===s||!s(e)))throw new Error("Unknown encoding: "+e);return t||e}(e),this.encoding){case"utf16le":this.text=c,this.end=u,t=4;break;case"utf8":this.fillLast=a,t=4;break;case"base64":this.text=l,this.end=h,t=3;break;default:return this.write=p,void(this.end=d)}this.lastNeed=0,this.lastTotal=0,this.lastChar=n.allocUnsafe(t)}function o(e){return e<=127?0:e>>5==6?2:e>>4==14?3:e>>3==30?4:e>>6==2?-1:-2}function a(e){var t=this.lastTotal-this.lastNeed,r=function(e,t,r){if(128!=(192&t[0]))return e.lastNeed=0,"�";if(e.lastNeed>1&&t.length>1){if(128!=(192&t[1]))return e.lastNeed=1,"�";if(e.lastNeed>2&&t.length>2&&128!=(192&t[2]))return e.lastNeed=2,"�"}}(this,e);return void 0!==r?r:this.lastNeed<=e.length?(e.copy(this.lastChar,t,0,this.lastNeed),this.lastChar.toString(this.encoding,0,this.lastTotal)):(e.copy(this.lastChar,t,0,e.length),void(this.lastNeed-=e.length))}function c(e,t){if((e.length-t)%2==0){var r=e.toString("utf16le",t);if(r){var n=r.charCodeAt(r.length-1);if(n>=55296&&n<=56319)return this.lastNeed=2,this.lastTotal=4,this.lastChar[0]=e[e.length-2],this.lastChar[1]=e[e.length-1],r.slice(0,-1)}return r}return this.lastNeed=1,this.lastTotal=2,this.lastChar[0]=e[e.length-1],e.toString("utf16le",t,e.length-1)}function u(e){var t=e&&e.length?this.write(e):"";if(this.lastNeed){var r=this.lastTotal-this.lastNeed;return t+this.lastChar.toString("utf16le",0,r)}return t}function l(e,t){var r=(e.length-t)%3;return 0===r?e.toString("base64",t):(this.lastNeed=3-r,this.lastTotal=3,1===r?this.lastChar[0]=e[e.length-1]:(this.lastChar[0]=e[e.length-2],this.lastChar[1]=e[e.length-1]),e.toString("base64",t,e.length-r))}function h(e){var t=e&&e.length?this.write(e):"";return this.lastNeed?t+this.lastChar.toString("base64",0,3-this.lastNeed):t}function p(e){return e.toString(this.encoding)}function d(e){return e&&e.length?this.write(e):""}t.s=i,i.prototype.write=function(e){if(0===e.length)return"";var t,r;if(this.lastNeed){if(void 0===(t=this.fillLast(e)))return"";r=this.lastNeed,this.lastNeed=0}else r=0;return r<e.length?t?t+this.text(e,r):this.text(e,r):t||""},i.prototype.end=function(e){var t=e&&e.length?this.write(e):"";return this.lastNeed?t+"�":t},i.prototype.text=function(e,t){var r=function(e,t,r){var n=t.length-1;if(n<r)return 0;var s=o(t[n]);return s>=0?(s>0&&(e.lastNeed=s-1),s):--n<r||-2===s?0:(s=o(t[n]))>=0?(s>0&&(e.lastNeed=s-2),s):--n<r||-2===s?0:(s=o(t[n]))>=0?(s>0&&(2===s?s=0:e.lastNeed=s-3),s):0}(this,e,t);if(!this.lastNeed)return e.toString("utf8",t);this.lastTotal=r;var n=e.length-(r-this.lastNeed);return e.copy(this.lastChar,0,n),e.toString("utf8",t,n)},i.prototype.fillLast=function(e){if(this.lastNeed<=e.length)return e.copy(this.lastChar,this.lastTotal-this.lastNeed,0,this.lastNeed),this.lastChar.toString(this.encoding,0,this.lastTotal);e.copy(this.lastChar,this.lastTotal-this.lastNeed,0,e.length),this.lastNeed-=e.length}},5457:(e,t,r)=>{"use strict";r.d(t,{F2:()=>o,G6:()=>u,$U:()=>a,vw:()=>s,rq:()=>n,Nm:()=>c,EL:()=>l,jR:()=>i});const n=e=>Math.floor(e/25.4*72*20),s=e=>Math.floor(72*e*20),i=(e=0)=>{let t=e;return()=>++t},o=i(),a=i(1),c=i(),u=i(),l=()=>((e=21)=>{let t="",r=e;for(;r--;)t+="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict"[64*Math.random()|0];return t})().toLowerCase()},5575:(e,t,r)=>{"use strict";r.r(t),r.d(t,{abstractNumUniqueNumericId:()=>n.F2,bookmarkUniqueNumericId:()=>n.G6,concreteNumUniqueNumericId:()=>n.$U,convertInchesToTwip:()=>n.vw,convertMillimetersToTwip:()=>n.rq,dateTimeValue:()=>s.sF,decimalNumber:()=>s.vH,docPropertiesUniqueNumericId:()=>n.Nm,eighthPointMeasureValue:()=>s.LV,hexColorValue:()=>s.dg,hpsMeasureValue:()=>s.KR,longHexNumber:()=>s.mA,measurementOrPercentValue:()=>s.aB,percentageValue:()=>s.wp,pointMeasureValue:()=>s.gg,positiveUniversalMeasureValue:()=>s._p,shortHexNumber:()=>s.G0,signedHpsMeasureValue:()=>s.Rg,signedTwipsMeasureValue:()=>s.xb,twipsMeasureValue:()=>s.Jd,uCharHexNumber:()=>s.xD,uniqueId:()=>n.EL,uniqueNumericIdCreator:()=>n.jR,universalMeasureValue:()=>s.KC,unsignedDecimalNumber:()=>s.f$});var n=r(5457),s=r(6595)},6595:(e,t,r)=>{"use strict";r.d(t,{G0:()=>a,Jd:()=>m,KC:()=>u,KR:()=>d,LV:()=>y,Rg:()=>f,_p:()=>l,aB:()=>g,dg:()=>h,f$:()=>s,gg:()=>b,mA:()=>o,sF:()=>v,vH:()=>n,wp:()=>w,xD:()=>c,xb:()=>p});const n=e=>{if(isNaN(e))throw new Error(`Invalid value '${e}' specified. Must be an integer.`);return Math.floor(e)},s=e=>{const t=n(e);if(t<0)throw new Error(`Invalid value '${e}' specified. Must be a positive integer.`);return t},i=(e,t)=>{const r=2*t;if(e.length!==r||isNaN(Number(`0x${e}`)))throw new Error(`Invalid hex value '${e}'. Expected ${r} digit hex value`);return e},o=e=>i(e,4),a=e=>i(e,2),c=e=>i(e,1),u=e=>{const t=e.slice(-2),r=e.substring(0,e.length-2);return`${Number(r)}${t}`},l=e=>{const t=u(e);if(parseFloat(t)<0)throw new Error(`Invalid value '${t}' specified. Expected a positive number.`);return t},h=e=>{if("auto"===e)return e;const t="#"===e.charAt(0)?e.substring(1):e;return i(t,3)},p=e=>"string"==typeof e?u(e):n(e),d=e=>"string"==typeof e?l(e):s(e),f=e=>"string"==typeof e?u(e):n(e),m=e=>"string"==typeof e?l(e):s(e),w=e=>{const t=e.substring(0,e.length-1);return`${Number(t)}%`},g=e=>"number"==typeof e?n(e):"%"===e.slice(-1)?w(e):u(e),y=s,b=s,v=e=>e.toISOString()},4927:(e,t,r)=>{function n(e){try{if(!r.g.localStorage)return!1}catch(e){return!1}var t=r.g.localStorage[e];return null!=t&&"true"===String(t).toLowerCase()}e.exports=function(e,t){if(n("noDeprecation"))return e;var r=!1;return function(){if(!r){if(n("throwDeprecation"))throw new Error(t);n("traceDeprecation")?console.trace(t):console.warn(t),r=!0}return e.apply(this,arguments)}}},9881:e=>{e.exports={isArray:function(e){return Array.isArray?Array.isArray(e):"[object Array]"===Object.prototype.toString.call(e)}}},7888:(e,t,r)=>{var n=r(1229),s=r(1388),i=r(6501),o=r(4673);e.exports={xml2js:n,xml2json:s,js2xml:i,json2xml:o}},6501:(e,t,r)=>{var n,s,i=r(4740),o=r(9881).isArray;function a(e,t,r){return(!r&&e.spaces?"\n":"")+Array(t+1).join(e.spaces)}function c(e,t,r){if(t.ignoreAttributes)return"";"attributesFn"in t&&(e=t.attributesFn(e,s,n));var i,o,c,u,l=[];for(i in e)e.hasOwnProperty(i)&&null!==e[i]&&void 0!==e[i]&&(u=t.noQuotesForNativeAttributes&&"string"!=typeof e[i]?"":'"',o=(o=""+e[i]).replace(/"/g,"&quot;"),c="attributeNameFn"in t?t.attributeNameFn(i,o,s,n):i,l.push(t.spaces&&t.indentAttributes?a(t,r+1,!1):" "),l.push(c+"="+u+("attributeValueFn"in t?t.attributeValueFn(o,i,s,n):o)+u));return e&&Object.keys(e).length&&t.spaces&&t.indentAttributes&&l.push(a(t,r,!1)),l.join("")}function u(e,t,r){return n=e,s="xml",t.ignoreDeclaration?"":"<?xml"+c(e[t.attributesKey],t,r)+"?>"}function l(e,t,r){if(t.ignoreInstruction)return"";var i;for(i in e)if(e.hasOwnProperty(i))break;var o="instructionNameFn"in t?t.instructionNameFn(i,e[i],s,n):i;if("object"==typeof e[i])return n=e,s=o,"<?"+o+c(e[i][t.attributesKey],t,r)+"?>";var a=e[i]?e[i]:"";return"instructionFn"in t&&(a=t.instructionFn(a,i,s,n)),"<?"+o+(a?" "+a:"")+"?>"}function h(e,t){return t.ignoreComment?"":"\x3c!--"+("commentFn"in t?t.commentFn(e,s,n):e)+"--\x3e"}function p(e,t){return t.ignoreCdata?"":"<![CDATA["+("cdataFn"in t?t.cdataFn(e,s,n):e.replace("]]>","]]]]><![CDATA[>"))+"]]>"}function d(e,t){return t.ignoreDoctype?"":"<!DOCTYPE "+("doctypeFn"in t?t.doctypeFn(e,s,n):e)+">"}function f(e,t){return t.ignoreText?"":(e=(e=(e=""+e).replace(/&amp;/g,"&")).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),"textFn"in t?t.textFn(e,s,n):e)}function m(e,t,r,i){return e.reduce((function(e,o){var u=a(t,r,i&&!e);switch(o.type){case"element":return e+u+function(e,t,r){n=e,s=e.name;var i=[],o="elementNameFn"in t?t.elementNameFn(e.name,e):e.name;i.push("<"+o),e[t.attributesKey]&&i.push(c(e[t.attributesKey],t,r));var a=e[t.elementsKey]&&e[t.elementsKey].length||e[t.attributesKey]&&"preserve"===e[t.attributesKey]["xml:space"];return a||(a="fullTagEmptyElementFn"in t?t.fullTagEmptyElementFn(e.name,e):t.fullTagEmptyElement),a?(i.push(">"),e[t.elementsKey]&&e[t.elementsKey].length&&(i.push(m(e[t.elementsKey],t,r+1)),n=e,s=e.name),i.push(t.spaces&&function(e,t){var r;if(e.elements&&e.elements.length)for(r=0;r<e.elements.length;++r)switch(e.elements[r][t.typeKey]){case"text":if(t.indentText)return!0;break;case"cdata":if(t.indentCdata)return!0;break;case"instruction":if(t.indentInstruction)return!0;break;default:return!0}return!1}(e,t)?"\n"+Array(r+1).join(t.spaces):""),i.push("</"+o+">")):i.push("/>"),i.join("")}(o,t,r);case"comment":return e+u+h(o[t.commentKey],t);case"doctype":return e+u+d(o[t.doctypeKey],t);case"cdata":return e+(t.indentCdata?u:"")+p(o[t.cdataKey],t);case"text":return e+(t.indentText?u:"")+f(o[t.textKey],t);case"instruction":var w={};return w[o[t.nameKey]]=o[t.attributesKey]?o:o[t.instructionKey],e+(t.indentInstruction?u:"")+l(w,t,r)}}),"")}function w(e,t,r){var n;for(n in e)if(e.hasOwnProperty(n))switch(n){case t.parentKey:case t.attributesKey:break;case t.textKey:if(t.indentText||r)return!0;break;case t.cdataKey:if(t.indentCdata||r)return!0;break;case t.instructionKey:if(t.indentInstruction||r)return!0;break;case t.doctypeKey:case t.commentKey:default:return!0}return!1}function g(e,t,r,i,o){n=e,s=t;var u="elementNameFn"in r?r.elementNameFn(t,e):t;if(null==e||""===e)return"fullTagEmptyElementFn"in r&&r.fullTagEmptyElementFn(t,e)||r.fullTagEmptyElement?"<"+u+"></"+u+">":"<"+u+"/>";var l=[];if(t){if(l.push("<"+u),"object"!=typeof e)return l.push(">"+f(e,r)+"</"+u+">"),l.join("");e[r.attributesKey]&&l.push(c(e[r.attributesKey],r,i));var h=w(e,r,!0)||e[r.attributesKey]&&"preserve"===e[r.attributesKey]["xml:space"];if(h||(h="fullTagEmptyElementFn"in r?r.fullTagEmptyElementFn(t,e):r.fullTagEmptyElement),!h)return l.push("/>"),l.join("");l.push(">")}return l.push(y(e,r,i+1,!1)),n=e,s=t,t&&l.push((o?a(r,i,!1):"")+"</"+u+">"),l.join("")}function y(e,t,r,n){var s,i,c,m=[];for(i in e)if(e.hasOwnProperty(i))for(c=o(e[i])?e[i]:[e[i]],s=0;s<c.length;++s){switch(i){case t.declarationKey:m.push(u(c[s],t,r));break;case t.instructionKey:m.push((t.indentInstruction?a(t,r,n):"")+l(c[s],t,r));break;case t.attributesKey:case t.parentKey:break;case t.textKey:m.push((t.indentText?a(t,r,n):"")+f(c[s],t));break;case t.cdataKey:m.push((t.indentCdata?a(t,r,n):"")+p(c[s],t));break;case t.doctypeKey:m.push(a(t,r,n)+d(c[s],t));break;case t.commentKey:m.push(a(t,r,n)+h(c[s],t));break;default:m.push(a(t,r,n)+g(c[s],i,t,r,w(c[s],t)))}n=n&&!m.length}return m.join("")}e.exports=function(e,t){t=function(e){var t=i.copyOptions(e);return i.ensureFlagExists("ignoreDeclaration",t),i.ensureFlagExists("ignoreInstruction",t),i.ensureFlagExists("ignoreAttributes",t),i.ensureFlagExists("ignoreText",t),i.ensureFlagExists("ignoreComment",t),i.ensureFlagExists("ignoreCdata",t),i.ensureFlagExists("ignoreDoctype",t),i.ensureFlagExists("compact",t),i.ensureFlagExists("indentText",t),i.ensureFlagExists("indentCdata",t),i.ensureFlagExists("indentAttributes",t),i.ensureFlagExists("indentInstruction",t),i.ensureFlagExists("fullTagEmptyElement",t),i.ensureFlagExists("noQuotesForNativeAttributes",t),i.ensureSpacesExists(t),"number"==typeof t.spaces&&(t.spaces=Array(t.spaces+1).join(" ")),i.ensureKeyExists("declaration",t),i.ensureKeyExists("instruction",t),i.ensureKeyExists("attributes",t),i.ensureKeyExists("text",t),i.ensureKeyExists("comment",t),i.ensureKeyExists("cdata",t),i.ensureKeyExists("doctype",t),i.ensureKeyExists("type",t),i.ensureKeyExists("name",t),i.ensureKeyExists("elements",t),i.checkFnExists("doctype",t),i.checkFnExists("instruction",t),i.checkFnExists("cdata",t),i.checkFnExists("comment",t),i.checkFnExists("text",t),i.checkFnExists("instructionName",t),i.checkFnExists("elementName",t),i.checkFnExists("attributeName",t),i.checkFnExists("attributeValue",t),i.checkFnExists("attributes",t),i.checkFnExists("fullTagEmptyElement",t),t}(t);var r=[];return n=e,s="_root_",t.compact?r.push(y(e,t,0,!0)):(e[t.declarationKey]&&r.push(u(e[t.declarationKey],t,0)),e[t.elementsKey]&&e[t.elementsKey].length&&r.push(m(e[t.elementsKey],t,0,!r.length))),r.join("")}},4673:(e,t,r)=>{var n=r(6501);e.exports=function(e,t){e instanceof Buffer&&(e=e.toString());var r=null;if("string"==typeof e)try{r=JSON.parse(e)}catch(e){throw new Error("The JSON structure is invalid")}else r=e;return n(r,t)}},4740:(e,t,r)=>{var n=r(9881).isArray;e.exports={copyOptions:function(e){var t,r={};for(t in e)e.hasOwnProperty(t)&&(r[t]=e[t]);return r},ensureFlagExists:function(e,t){e in t&&"boolean"==typeof t[e]||(t[e]=!1)},ensureSpacesExists:function(e){(!("spaces"in e)||"number"!=typeof e.spaces&&"string"!=typeof e.spaces)&&(e.spaces=0)},ensureAlwaysArrayExists:function(e){"alwaysArray"in e&&("boolean"==typeof e.alwaysArray||n(e.alwaysArray))||(e.alwaysArray=!1)},ensureKeyExists:function(e,t){e+"Key"in t&&"string"==typeof t[e+"Key"]||(t[e+"Key"]=t.compact?"_"+e:e)},checkFnExists:function(e,t){return e+"Fn"in t}}},1229:(e,t,r)=>{var n,s,i=r(6099),o=r(4740),a=r(9881).isArray;function c(e){var t=Number(e);if(!isNaN(t))return t;var r=e.toLowerCase();return"true"===r||"false"!==r&&e}function u(e,t){var r;if(n.compact){if(!s[n[e+"Key"]]&&(a(n.alwaysArray)?-1!==n.alwaysArray.indexOf(n[e+"Key"]):n.alwaysArray)&&(s[n[e+"Key"]]=[]),s[n[e+"Key"]]&&!a(s[n[e+"Key"]])&&(s[n[e+"Key"]]=[s[n[e+"Key"]]]),e+"Fn"in n&&"string"==typeof t&&(t=n[e+"Fn"](t,s)),"instruction"===e&&("instructionFn"in n||"instructionNameFn"in n))for(r in t)if(t.hasOwnProperty(r))if("instructionFn"in n)t[r]=n.instructionFn(t[r],r,s);else{var i=t[r];delete t[r],t[n.instructionNameFn(r,i,s)]=i}a(s[n[e+"Key"]])?s[n[e+"Key"]].push(t):s[n[e+"Key"]]=t}else{s[n.elementsKey]||(s[n.elementsKey]=[]);var o={};if(o[n.typeKey]=e,"instruction"===e){for(r in t)if(t.hasOwnProperty(r))break;o[n.nameKey]="instructionNameFn"in n?n.instructionNameFn(r,t,s):r,n.instructionHasAttributes?(o[n.attributesKey]=t[r][n.attributesKey],"instructionFn"in n&&(o[n.attributesKey]=n.instructionFn(o[n.attributesKey],r,s))):("instructionFn"in n&&(t[r]=n.instructionFn(t[r],r,s)),o[n.instructionKey]=t[r])}else e+"Fn"in n&&(t=n[e+"Fn"](t,s)),o[n[e+"Key"]]=t;n.addParent&&(o[n.parentKey]=s),s[n.elementsKey].push(o)}}function l(e){var t;if("attributesFn"in n&&e&&(e=n.attributesFn(e,s)),(n.trim||"attributeValueFn"in n||"attributeNameFn"in n||n.nativeTypeAttributes)&&e)for(t in e)if(e.hasOwnProperty(t)&&(n.trim&&(e[t]=e[t].trim()),n.nativeTypeAttributes&&(e[t]=c(e[t])),"attributeValueFn"in n&&(e[t]=n.attributeValueFn(e[t],t,s)),"attributeNameFn"in n)){var r=e[t];delete e[t],e[n.attributeNameFn(t,e[t],s)]=r}return e}function h(e){var t={};if(e.body&&("xml"===e.name.toLowerCase()||n.instructionHasAttributes)){for(var r,i=/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\w+))\s*/g;null!==(r=i.exec(e.body));)t[r[1]]=r[2]||r[3]||r[4];t=l(t)}if("xml"===e.name.toLowerCase()){if(n.ignoreDeclaration)return;s[n.declarationKey]={},Object.keys(t).length&&(s[n.declarationKey][n.attributesKey]=t),n.addParent&&(s[n.declarationKey][n.parentKey]=s)}else{if(n.ignoreInstruction)return;n.trim&&(e.body=e.body.trim());var o={};n.instructionHasAttributes&&Object.keys(t).length?(o[e.name]={},o[e.name][n.attributesKey]=t):o[e.name]=e.body,u("instruction",o)}}function p(e,t){var r;if("object"==typeof e&&(t=e.attributes,e=e.name),t=l(t),"elementNameFn"in n&&(e=n.elementNameFn(e,s)),n.compact){var i;if(r={},!n.ignoreAttributes&&t&&Object.keys(t).length)for(i in r[n.attributesKey]={},t)t.hasOwnProperty(i)&&(r[n.attributesKey][i]=t[i]);!(e in s)&&(a(n.alwaysArray)?-1!==n.alwaysArray.indexOf(e):n.alwaysArray)&&(s[e]=[]),s[e]&&!a(s[e])&&(s[e]=[s[e]]),a(s[e])?s[e].push(r):s[e]=r}else s[n.elementsKey]||(s[n.elementsKey]=[]),(r={})[n.typeKey]="element",r[n.nameKey]=e,!n.ignoreAttributes&&t&&Object.keys(t).length&&(r[n.attributesKey]=t),n.alwaysChildren&&(r[n.elementsKey]=[]),s[n.elementsKey].push(r);r[n.parentKey]=s,s=r}function d(e){n.ignoreText||(e.trim()||n.captureSpacesBetweenElements)&&(n.trim&&(e=e.trim()),n.nativeType&&(e=c(e)),n.sanitize&&(e=e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")),u("text",e))}function f(e){n.ignoreComment||(n.trim&&(e=e.trim()),u("comment",e))}function m(e){var t=s[n.parentKey];n.addParent||delete s[n.parentKey],s=t}function w(e){n.ignoreCdata||(n.trim&&(e=e.trim()),u("cdata",e))}function g(e){n.ignoreDoctype||(e=e.replace(/^ /,""),n.trim&&(e=e.trim()),u("doctype",e))}function y(e){e.note=e}e.exports=function(e,t){var r=i.parser(!0,{}),a={};if(s=a,n=function(e){return n=o.copyOptions(e),o.ensureFlagExists("ignoreDeclaration",n),o.ensureFlagExists("ignoreInstruction",n),o.ensureFlagExists("ignoreAttributes",n),o.ensureFlagExists("ignoreText",n),o.ensureFlagExists("ignoreComment",n),o.ensureFlagExists("ignoreCdata",n),o.ensureFlagExists("ignoreDoctype",n),o.ensureFlagExists("compact",n),o.ensureFlagExists("alwaysChildren",n),o.ensureFlagExists("addParent",n),o.ensureFlagExists("trim",n),o.ensureFlagExists("nativeType",n),o.ensureFlagExists("nativeTypeAttributes",n),o.ensureFlagExists("sanitize",n),o.ensureFlagExists("instructionHasAttributes",n),o.ensureFlagExists("captureSpacesBetweenElements",n),o.ensureAlwaysArrayExists(n),o.ensureKeyExists("declaration",n),o.ensureKeyExists("instruction",n),o.ensureKeyExists("attributes",n),o.ensureKeyExists("text",n),o.ensureKeyExists("comment",n),o.ensureKeyExists("cdata",n),o.ensureKeyExists("doctype",n),o.ensureKeyExists("type",n),o.ensureKeyExists("name",n),o.ensureKeyExists("elements",n),o.ensureKeyExists("parent",n),o.checkFnExists("doctype",n),o.checkFnExists("instruction",n),o.checkFnExists("cdata",n),o.checkFnExists("comment",n),o.checkFnExists("text",n),o.checkFnExists("instructionName",n),o.checkFnExists("elementName",n),o.checkFnExists("attributeName",n),o.checkFnExists("attributeValue",n),o.checkFnExists("attributes",n),n}(t),r.opt={strictEntities:!0},r.onopentag=p,r.ontext=d,r.oncomment=f,r.onclosetag=m,r.onerror=y,r.oncdata=w,r.ondoctype=g,r.onprocessinginstruction=h,r.write(e).close(),a[n.elementsKey]){var c=a[n.elementsKey];delete a[n.elementsKey],a[n.elementsKey]=c,delete a.text}return a}},1388:(e,t,r)=>{var n=r(4740),s=r(1229);e.exports=function(e,t){var r,i,o;return r=function(e){var t=n.copyOptions(e);return n.ensureSpacesExists(t),t}(t),i=s(e,r),o="compact"in r&&r.compact?"_parent":"parent",("addParent"in r&&r.addParent?JSON.stringify(i,(function(e,t){return e===o?"_":t}),r.spaces):JSON.stringify(i,null,r.spaces)).replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}},255:e=>{var t={"&":"&amp;",'"':"&quot;","'":"&apos;","<":"&lt;",">":"&gt;"};e.exports=function(e){return e&&e.replace?e.replace(/([&"<>'])/g,(function(e,r){return t[r]})):e}},3479:(e,t,r)=>{var n=r(4155),s=r(255),i=r(2830).Stream;function o(e,t,r){r=r||0;var n,i,a=(n=t,new Array(r||0).join(n||"")),c=e;if("object"==typeof e&&(c=e[i=Object.keys(e)[0]])&&c._elem)return c._elem.name=i,c._elem.icount=r,c._elem.indent=t,c._elem.indents=a,c._elem.interrupt=c,c._elem;var u,l=[],h=[];function p(e){Object.keys(e).forEach((function(t){l.push(function(e,t){return e+'="'+s(t)+'"'}(t,e[t]))}))}switch(typeof c){case"object":if(null===c)break;c._attr&&p(c._attr),c._cdata&&h.push(("<![CDATA["+c._cdata).replace(/\]\]>/g,"]]]]><![CDATA[>")+"]]>"),c.forEach&&(u=!1,h.push(""),c.forEach((function(e){"object"==typeof e?"_attr"==Object.keys(e)[0]?p(e._attr):h.push(o(e,t,r+1)):(h.pop(),u=!0,h.push(s(e)))})),u||h.push(""));break;default:h.push(s(c))}return{name:i,interrupt:!1,attributes:l,content:h,icount:r,indents:a,indent:t}}function a(e,t,r){if("object"!=typeof t)return e(!1,t);var n=t.interrupt?1:t.content.length;function s(){for(;t.content.length;){var s=t.content.shift();if(void 0!==s){if(i(s))return;a(e,s)}}e(!1,(n>1?t.indents:"")+(t.name?"</"+t.name+">":"")+(t.indent&&!r?"\n":"")),r&&r()}function i(t){return!!t.interrupt&&(t.interrupt.append=e,t.interrupt.end=s,t.interrupt=!1,e(!0),!0)}if(e(!1,t.indents+(t.name?"<"+t.name:"")+(t.attributes.length?" "+t.attributes.join(" "):"")+(n?t.name?">":"":t.name?"/>":"")+(t.indent&&n>1?"\n":"")),!n)return e(!1,t.indent?"\n":"");i(t)||s()}e.exports=function(e,t){"object"!=typeof t&&(t={indent:t});var r,s,c=t.stream?new i:null,u="",l=!1,h=t.indent?!0===t.indent?"    ":t.indent:"",p=!0;function d(e){p?n.nextTick(e):e()}function f(e,t){if(void 0!==t&&(u+=t),e&&!l&&(c=c||new i,l=!0),e&&l){var r=u;d((function(){c.emit("data",r)})),u=""}}function m(e,t){a(f,o(e,h,h?1:0),t)}function w(){if(c){var e=u;d((function(){c.emit("data",e),c.emit("end"),c.readable=!1,c.emit("close")}))}}return d((function(){p=!1})),t.declaration&&(s={version:"1.0",encoding:(r=t.declaration).encoding||"UTF-8"},r.standalone&&(s.standalone=r.standalone),m({"?xml":{_attr:s}}),u=u.replace("/>","?>")),e&&e.forEach?e.forEach((function(t,r){var n;r+1===e.length&&(n=w),m(t,n)})):m(e,w),c?(c.readable=!0,c):u},e.exports.element=e.exports.Element=function(){var e=Array.prototype.slice.call(arguments),t={_elem:o(e),push:function(e){if(!this.append)throw new Error("not assigned to a parent!");var t=this,r=this._elem.indent;a(this.append,o(e,r,this._elem.icount+(r?1:0)),(function(){t.append(!0)}))},close:function(e){void 0!==e&&this.push(e),this.end&&this.end()}};return t}}},t={};function r(n){var s=t[n];if(void 0!==s)return s.exports;var i=t[n]={exports:{}};return e[n].call(i.exports,i,i.exports,r),i.exports}r.d=(e,t)=>{for(var n in t)r.o(t,n)&&!r.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:t[n]})},r.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),r.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var n={};return(()=>{"use strict";r.r(n),r.d(n,{AbstractNumbering:()=>fo,Alignment:()=>M,AlignmentAttributes:()=>B,AlignmentType:()=>w,AnnotationReference:()=>Er,Attributes:()=>c,BaseEmphasisMark:()=>re,BaseXmlComponent:()=>e,Body:()=>Rn,Bookmark:()=>tn,BookmarkEnd:()=>nn,BookmarkStart:()=>rn,Border:()=>j,BorderElement:()=>U,BorderStyle:()=>g,BuilderElement:()=>F,CarriageReturn:()=>Rr,Column:()=>kn,ColumnBreak:()=>Pr,Columns:()=>pn,Comment:()=>dr,CommentRangeEnd:()=>hr,CommentRangeStart:()=>lr,CommentReference:()=>pr,Comments:()=>fr,ConcreteHyperlink:()=>Zr,ConcreteNumbering:()=>go,ContinuationSeparator:()=>Ir,DayLong:()=>vr,DayShort:()=>gr,DeletedTextRun:()=>ya,DocGridAttributes:()=>dn,Document:()=>ta,DocumentAttributes:()=>Cn,DocumentBackground:()=>Ln,DocumentBackgroundAttributes:()=>On,DocumentDefaults:()=>Jo,DocumentGrid:()=>fn,DocumentGridType:()=>St,DotEmphasisMark:()=>se,Drawing:()=>er,DropCapType:()=>Hn,EMPTY_OBJECT:()=>t,EmphasisMark:()=>ne,EmphasisMarkType:()=>T,EmptyElement:()=>C,EndnoteReference:()=>Ar,ExternalHyperlink:()=>Jr,File:()=>ta,FootNoteReferenceRunAttributes:()=>la,FootNotes:()=>Zi,Footer:()=>ua,FooterWrapper:()=>Hi,FootnoteReference:()=>ha,FootnoteReferenceElement:()=>Tr,FootnoteReferenceRun:()=>pa,FrameAnchorType:()=>jn,FrameProperties:()=>Gn,FramePropertiesAttributes:()=>Wn,FrameWrap:()=>zn,GridSpan:()=>qs,Header:()=>ca,HeaderFooterReference:()=>hn,HeaderFooterReferenceType:()=>Tt,HeaderFooterType:()=>At,HeaderWrapper:()=>eo,HeadingLevel:()=>gt,HeightRule:()=>li,HorizontalPosition:()=>Ce,HorizontalPositionAlign:()=>b,HorizontalPositionRelativeFrom:()=>Ee,HpsMeasureElement:()=>k,HyperlinkType:()=>_t,IgnoreIfEmptyXmlComponent:()=>i,ImageRun:()=>tr,ImportedRootElementAttributes:()=>d,ImportedXmlComponent:()=>p,Indent:()=>W,InitializableXmlComponent:()=>m,InsertedTextRun:()=>da,InternalHyperlink:()=>Yr,LastRenderedPageBreak:()=>Cr,LeaderType:()=>bt,Level:()=>uo,LevelBase:()=>co,LevelForOverride:()=>lo,LevelFormat:()=>pi,LevelOverride:()=>bo,LevelSuffix:()=>di,LineNumberRestartFormat:()=>It,LineNumberType:()=>mn,LineRuleType:()=>wt,Math:()=>Xn,MathAccentCharacter:()=>es,MathAngledBrackets:()=>Ms,MathBase:()=>ts,MathCurlyBrackets:()=>Bs,MathDegree:()=>_s,MathDenominator:()=>Zn,MathFraction:()=>Jn,MathFunction:()=>Rs,MathFunctionName:()=>Is,MathFunctionProperties:()=>Ns,MathIntegral:()=>ps,MathLimitLocation:()=>ns,MathNAryProperties:()=>cs,MathNumerator:()=>Yn,MathPreSubSuperScript:()=>vs,MathPreSubSuperScriptProperties:()=>bs,MathRadical:()=>Ss,MathRadicalProperties:()=>As,MathRoundBrackets:()=>Ps,MathRun:()=>qn,MathSquareBrackets:()=>Fs,MathSubScript:()=>ws,MathSubScriptElement:()=>us,MathSubScriptProperties:()=>ms,MathSubSuperScript:()=>ys,MathSubSuperScriptProperties:()=>gs,MathSum:()=>hs,MathSuperScript:()=>fs,MathSuperScriptElement:()=>ls,MathSuperScriptProperties:()=>ds,Media:()=>to,MonthLong:()=>xr,MonthShort:()=>yr,NextAttributeComponent:()=>a,NoBreakHyphen:()=>mr,NumberFormat:()=>x,NumberProperties:()=>Wr,NumberValueElement:()=>L,Numbering:()=>_o,OnOffElement:()=>R,OutlineLevel:()=>sn,OverlapType:()=>ci,Packer:()=>Ia,PageBorderDisplay:()=>Nt,PageBorderOffsetFrom:()=>Rt,PageBorderZOrder:()=>kt,PageBorders:()=>gn,PageBreak:()=>Dr,PageBreakBefore:()=>Fr,PageMargin:()=>yn,PageNumber:()=>I,PageNumberElement:()=>Nr,PageNumberSeparator:()=>Ct,PageNumberType:()=>vn,PageNumberTypeAttributes:()=>bn,PageOrientation:()=>Ot,PageReference:()=>an,PageSize:()=>xn,PageTextDirection:()=>En,PageTextDirectionType:()=>Lt,Paragraph:()=>Vn,ParagraphProperties:()=>Kn,ParagraphPropertiesDefaults:()=>Zo,PatchType:()=>Ya,PositionalTab:()=>Or,PositionalTabAlignment:()=>pt,PositionalTabLeader:()=>ft,PositionalTabRelativeTo:()=>dt,PrettifyType:()=>Aa,RelativeHorizontalPosition:()=>oi,RelativeVerticalPosition:()=>ai,Run:()=>ye,RunFonts:()=>le,RunProperties:()=>me,RunPropertiesChange:()=>we,RunPropertiesDefaults:()=>Yo,SectionProperties:()=>Nn,SectionType:()=>Dt,SectionTypeAttributes:()=>Tn,Separator:()=>Sr,SequentialIdentifier:()=>nr,Shading:()=>ee,ShadingType:()=>E,SimpleField:()=>ir,SimpleMailMergeField:()=>or,SimplePos:()=>Ie,SoftHyphen:()=>wr,SpaceType:()=>_,Spacing:()=>Mr,StringContainer:()=>P,StringEnumValueElement:()=>D,StringValueElement:()=>O,Style:()=>Ur,StyleForCharacter:()=>Do,StyleForParagraph:()=>Lo,StyleLevel:()=>aa,Styles:()=>qo,SymbolRun:()=>_e,TDirection:()=>Qs,Tab:()=>kr,TabAttributes:()=>jr,TabStop:()=>Hr,TabStopItem:()=>zr,TabStopPosition:()=>vt,TabStopType:()=>yt,Table:()=>yi,TableAnchorType:()=>ii,TableBorders:()=>si,TableCell:()=>ti,TableCellBorders:()=>Xs,TableFloatProperties:()=>fi,TableLayout:()=>wi,TableLayoutType:()=>ui,TableOfContents:()=>oa,TableProperties:()=>gi,TableRow:()=>_i,TableRowHeight:()=>vi,TableRowHeightAttributes:()=>bi,TableRowProperties:()=>xi,TableWidthElement:()=>Ks,TextDirection:()=>Gs,TextEffect:()=>S,TextRun:()=>be,TextWrappingSide:()=>ht,TextWrappingType:()=>lt,ThematicBreak:()=>z,Type:()=>An,Underline:()=>fe,UnderlineType:()=>A,VerticalAlign:()=>Et,VerticalAlignAttributes:()=>cn,VerticalAlignElement:()=>un,VerticalMerge:()=>Ys,VerticalMergeType:()=>Ws,VerticalPosition:()=>Le,VerticalPositionAlign:()=>v,VerticalPositionRelativeFrom:()=>Te,WORKAROUND2:()=>ra,WORKAROUND3:()=>f,WORKAROUND4:()=>xs,WidthType:()=>js,WrapNone:()=>Pt,WrapSquare:()=>Bt,WrapTight:()=>Ut,WrapTopAndBottom:()=>jt,XmlAttributeComponent:()=>o,XmlComponent:()=>s,YearLong:()=>_r,YearShort:()=>br,abstractNumUniqueNumericId:()=>Na.abstractNumUniqueNumericId,bookmarkUniqueNumericId:()=>Na.bookmarkUniqueNumericId,concreteNumUniqueNumericId:()=>Na.concreteNumUniqueNumericId,convertInchesToTwip:()=>Na.convertInchesToTwip,convertMillimetersToTwip:()=>Na.convertMillimetersToTwip,convertToXmlComponent:()=>l,dateTimeValue:()=>Na.dateTimeValue,decimalNumber:()=>Na.decimalNumber,docPropertiesUniqueNumericId:()=>Na.docPropertiesUniqueNumericId,eighthPointMeasureValue:()=>Na.eighthPointMeasureValue,hexColorValue:()=>Na.hexColorValue,hpsMeasureValue:()=>Na.hpsMeasureValue,longHexNumber:()=>Na.longHexNumber,measurementOrPercentValue:()=>Na.measurementOrPercentValue,patchDocument:()=>Qa,percentageValue:()=>Na.percentageValue,pointMeasureValue:()=>Na.pointMeasureValue,positiveUniversalMeasureValue:()=>Na.positiveUniversalMeasureValue,sectionMarginDefaults:()=>Sn,sectionPageSizeDefaults:()=>In,shortHexNumber:()=>Na.shortHexNumber,signedHpsMeasureValue:()=>Na.signedHpsMeasureValue,signedTwipsMeasureValue:()=>Na.signedTwipsMeasureValue,twipsMeasureValue:()=>Na.twipsMeasureValue,uCharHexNumber:()=>Na.uCharHexNumber,uniqueId:()=>Na.uniqueId,uniqueNumericIdCreator:()=>Na.uniqueNumericIdCreator,universalMeasureValue:()=>Na.universalMeasureValue,unsignedDecimalNumber:()=>Na.unsignedDecimalNumber});class e{constructor(e){this.rootKey=e}}const t=Object.seal({});class s extends e{constructor(e){super(e),this.root=new Array}prepForXml(r){var n;r.stack.push(this);const s=this.root.map((t=>t instanceof e?t.prepForXml(r):t)).filter((e=>void 0!==e));return r.stack.pop(),{[this.rootKey]:s.length?1===s.length&&(null===(n=s[0])||void 0===n?void 0:n._attr)?s[0]:s:t}}addChildElement(e){return this.root.push(e),this}}class i extends s{prepForXml(e){const t=super.prepForXml(e);if(t&&("object"!=typeof t[this.rootKey]||Object.keys(t[this.rootKey]).length))return t}}class o extends e{constructor(e){super("_attr"),this.root=e}prepForXml(e){const t={};return Object.keys(this.root).forEach((e=>{const r=this.root[e];if(void 0!==r){const n=this.xmlKeys&&this.xmlKeys[e]||e;t[n]=r}})),{_attr:t}}}class a extends e{constructor(e){super("_attr"),this.root=e}prepForXml(e){return{_attr:Object.values(this.root).filter((({value:e})=>void 0!==e)).reduce(((e,{key:t,value:r})=>Object.assign(Object.assign({},e),{[t]:r})),{})}}}class c extends o{constructor(){super(...arguments),this.xmlKeys={val:"w:val",color:"w:color",fill:"w:fill",space:"w:space",sz:"w:sz",type:"w:type",rsidR:"w:rsidR",rsidRPr:"w:rsidRPr",rsidSect:"w:rsidSect",w:"w:w",h:"w:h",top:"w:top",right:"w:right",bottom:"w:bottom",left:"w:left",header:"w:header",footer:"w:footer",gutter:"w:gutter",linePitch:"w:linePitch",pos:"w:pos"}}}var u=r(7888);const l=e=>{switch(e.type){case void 0:case"element":const t=new p(e.name,e.attributes),r=e.elements||[];for(const e of r){const r=l(e);void 0!==r&&t.push(r)}return t;case"text":return e.text;default:return}};class h extends o{}class p extends s{static fromXmlString(e){const t=(0,u.xml2js)(e,{compact:!1});return l(t)}constructor(e,t){super(e),t&&this.root.push(new h(t))}push(e){this.root.push(e)}}class d extends s{constructor(e){super(""),this._attr=e}prepForXml(e){return{_attr:this._attr}}}const f="";class m extends s{constructor(e,t){super(e),t&&(this.root=t.root)}}var w,g,y,b,v,x,_,E,T,A,S,I,N=r(6595);class R extends s{constructor(e,t=!0){super(e),!0!==t&&this.root.push(new c({val:t}))}}class k extends s{constructor(e,t){super(e),this.root.push(new c({val:(0,N.KR)(t)}))}}class C extends s{}class O extends s{constructor(e,t){super(e),this.root.push(new c({val:t}))}}class L extends s{constructor(e,t){super(e),this.root.push(new c({val:t}))}}class D extends s{constructor(e,t){super(e),this.root.push(new c({val:t}))}}class P extends s{constructor(e,t){super(e),this.root.push(t)}}class F extends s{constructor(e){super(e.name),e.attributes&&this.root.push(new a(e.attributes))}}!function(e){e.START="start",e.CENTER="center",e.END="end",e.BOTH="both",e.MEDIUM_KASHIDA="mediumKashida",e.DISTRIBUTE="distribute",e.NUM_TAB="numTab",e.HIGH_KASHIDA="highKashida",e.LOW_KASHIDA="lowKashida",e.THAI_DISTRIBUTE="thaiDistribute",e.LEFT="left",e.RIGHT="right",e.JUSTIFIED="both"}(w||(w={}));class B extends o{constructor(){super(...arguments),this.xmlKeys={val:"w:val"}}}class M extends s{constructor(e){super("w:jc"),this.root.push(new B({val:e}))}}class U extends s{constructor(e,{color:t,size:r,space:n,style:s}){super(e),this.root.push(new H({style:s,color:void 0===t?void 0:(0,N.dg)(t),size:void 0===r?void 0:(0,N.LV)(r),space:void 0===n?void 0:(0,N.gg)(n)}))}}class H extends o{constructor(){super(...arguments),this.xmlKeys={style:"w:val",color:"w:color",size:"w:sz",space:"w:space"}}}!function(e){e.SINGLE="single",e.DASH_DOT_STROKED="dashDotStroked",e.DASHED="dashed",e.DASH_SMALL_GAP="dashSmallGap",e.DOT_DASH="dotDash",e.DOT_DOT_DASH="dotDotDash",e.DOTTED="dotted",e.DOUBLE="double",e.DOUBLE_WAVE="doubleWave",e.INSET="inset",e.NIL="nil",e.NONE="none",e.OUTSET="outset",e.THICK="thick",e.THICK_THIN_LARGE_GAP="thickThinLargeGap",e.THICK_THIN_MEDIUM_GAP="thickThinMediumGap",e.THICK_THIN_SMALL_GAP="thickThinSmallGap",e.THIN_THICK_LARGE_GAP="thinThickLargeGap",e.THIN_THICK_MEDIUM_GAP="thinThickMediumGap",e.THIN_THICK_SMALL_GAP="thinThickSmallGap",e.THIN_THICK_THIN_LARGE_GAP="thinThickThinLargeGap",e.THIN_THICK_THIN_MEDIUM_GAP="thinThickThinMediumGap",e.THIN_THICK_THIN_SMALL_GAP="thinThickThinSmallGap",e.THREE_D_EMBOSS="threeDEmboss",e.THREE_D_ENGRAVE="threeDEngrave",e.TRIPLE="triple",e.WAVE="wave"}(g||(g={}));class j extends i{constructor(e){super("w:pBdr"),e.top&&this.root.push(new U("w:top",e.top)),e.bottom&&this.root.push(new U("w:bottom",e.bottom)),e.left&&this.root.push(new U("w:left",e.left)),e.right&&this.root.push(new U("w:right",e.right))}}class z extends s{constructor(){super("w:pBdr");const e=new U("w:bottom",{color:"auto",space:1,style:g.SINGLE,size:6});this.root.push(e)}}class W extends s{constructor({start:e,end:t,left:r,right:n,hanging:s,firstLine:i}){super("w:ind"),this.root.push(new a({start:{key:"w:start",value:void 0===e?void 0:(0,N.xb)(e)},end:{key:"w:end",value:void 0===t?void 0:(0,N.xb)(t)},left:{key:"w:left",value:void 0===r?void 0:(0,N.xb)(r)},right:{key:"w:right",value:void 0===n?void 0:(0,N.xb)(n)},hanging:{key:"w:hanging",value:void 0===s?void 0:(0,N.Jd)(s)},firstLine:{key:"w:firstLine",value:void 0===i?void 0:(0,N.Jd)(i)}}))}}class G extends s{constructor(){super("w:br")}}!function(e){e.BEGIN="begin",e.END="end",e.SEPARATE="separate"}(y||(y={}));class K extends o{constructor(){super(...arguments),this.xmlKeys={type:"w:fldCharType",dirty:"w:dirty"}}}class V extends s{constructor(e){super("w:fldChar"),this.root.push(new K({type:y.BEGIN,dirty:e}))}}class X extends s{constructor(e){super("w:fldChar"),this.root.push(new K({type:y.SEPARATE,dirty:e}))}}class $ extends s{constructor(e){super("w:fldChar"),this.root.push(new K({type:y.END,dirty:e}))}}!function(e){e.CENTER="center",e.INSIDE="inside",e.LEFT="left",e.OUTSIDE="outside",e.RIGHT="right"}(b||(b={})),function(e){e.BOTTOM="bottom",e.CENTER="center",e.INSIDE="inside",e.OUTSIDE="outside",e.TOP="top"}(v||(v={})),function(e){e.DECIMAL="decimal",e.UPPER_ROMAN="upperRoman",e.LOWER_ROMAN="lowerRoman",e.UPPER_LETTER="upperLetter",e.LOWER_LETTER="lowerLetter",e.ORDINAL="ordinal",e.CARDINAL_TEXT="cardinalText",e.ORDINAL_TEXT="ordinalText",e.HEX="hex",e.CHICAGO="chicago",e.IDEOGRAPH_DIGITAL="ideographDigital",e.JAPANESE_COUNTING="japaneseCounting",e.AIUEO="aiueo",e.IROHA="iroha",e.DECIMAL_FULL_WIDTH="decimalFullWidth",e.DECIMAL_HALF_WIDTH="decimalHalfWidth",e.JAPANESE_LEGAL="japaneseLegal",e.JAPANESE_DIGITAL_TEN_THOUSAND="japaneseDigitalTenThousand",e.DECIMAL_ENCLOSED_CIRCLE="decimalEnclosedCircle",e.DECIMAL_FULL_WIDTH_2="decimalFullWidth2",e.AIUEO_FULL_WIDTH="aiueoFullWidth",e.IROHA_FULL_WIDTH="irohaFullWidth",e.DECIMAL_ZERO="decimalZero",e.BULLET="bullet",e.GANADA="ganada",e.CHOSUNG="chosung",e.DECIMAL_ENCLOSED_FULL_STOP="decimalEnclosedFullstop",e.DECIMAL_ENCLOSED_PAREN="decimalEnclosedParen",e.DECIMAL_ENCLOSED_CIRCLE_CHINESE="decimalEnclosedCircleChinese",e.IDEOGRAPH_ENCLOSED_CIRCLE="ideographEnclosedCircle",e.IDEOGRAPH_TRADITIONAL="ideographTraditional",e.IDEOGRAPH_ZODIAC="ideographZodiac",e.IDEOGRAPH_ZODIAC_TRADITIONAL="ideographZodiacTraditional",e.TAIWANESE_COUNTING="taiwaneseCounting",e.IDEOGRAPH_LEGAL_TRADITIONAL="ideographLegalTraditional",e.TAIWANESE_COUNTING_THOUSAND="taiwaneseCountingThousand",e.TAIWANESE_DIGITAL="taiwaneseDigital",e.CHINESE_COUNTING="chineseCounting",e.CHINESE_LEGAL_SIMPLIFIED="chineseLegalSimplified",e.CHINESE_COUNTING_TEN_THOUSAND="chineseCountingThousand",e.KOREAN_DIGITAL="koreanDigital",e.KOREAN_COUNTING="koreanCounting",e.KOREAN_LEGAL="koreanLegal",e.KOREAN_DIGITAL_2="koreanDigital2",e.VIETNAMESE_COUNTING="vietnameseCounting",e.RUSSIAN_LOWER="russianLower",e.RUSSIAN_UPPER="russianUpper",e.NONE="none",e.NUMBER_IN_DASH="numberInDash",e.HEBREW_1="hebrew1",e.HEBREW_2="hebrew2",e.ARABIC_ALPHA="arabicAlpha",e.ARABIC_ABJAD="arabicAbjad",e.HINDI_VOWELS="hindiVowels",e.HINDI_CONSONANTS="hindiConsonants",e.HINDI_NUMBERS="hindiNumbers",e.HINDI_COUNTING="hindiCounting",e.THAI_LETTERS="thaiLetters",e.THAI_NUMBERS="thaiNumbers",e.THAI_COUNTING="thaiCounting",e.BAHT_TEXT="bahtText",e.DOLLAR_TEXT="dollarText"}(x||(x={})),function(e){e.DEFAULT="default",e.PRESERVE="preserve"}(_||(_={}));class q extends o{constructor(){super(...arguments),this.xmlKeys={space:"xml:space"}}}class Z extends s{constructor(){super("w:instrText"),this.root.push(new q({space:_.PRESERVE})),this.root.push("PAGE")}}class Y extends s{constructor(){super("w:instrText"),this.root.push(new q({space:_.PRESERVE})),this.root.push("NUMPAGES")}}class J extends s{constructor(){super("w:instrText"),this.root.push(new q({space:_.PRESERVE})),this.root.push("SECTIONPAGES")}}class Q extends o{constructor(){super(...arguments),this.xmlKeys={fill:"w:fill",color:"w:color",type:"w:val"}}}class ee extends s{constructor({fill:e,color:t,type:r}){super("w:shd"),this.root.push(new Q({fill:void 0===e?void 0:(0,N.dg)(e),color:void 0===t?void 0:(0,N.dg)(t),type:r}))}}!function(e){e.CLEAR="clear",e.DIAGONAL_CROSS="diagCross",e.DIAGONAL_STRIPE="diagStripe",e.HORIZONTAL_CROSS="horzCross",e.HORIZONTAL_STRIPE="horzStripe",e.NIL="nil",e.PERCENT_5="pct5",e.PERCENT_10="pct10",e.PERCENT_12="pct12",e.PERCENT_15="pct15",e.PERCENT_20="pct20",e.PERCENT_25="pct25",e.PERCENT_30="pct30",e.PERCENT_35="pct35",e.PERCENT_37="pct37",e.PERCENT_40="pct40",e.PERCENT_45="pct45",e.PERCENT_50="pct50",e.PERCENT_55="pct55",e.PERCENT_60="pct60",e.PERCENT_62="pct62",e.PERCENT_65="pct65",e.PERCENT_70="pct70",e.PERCENT_75="pct75",e.PERCENT_80="pct80",e.PERCENT_85="pct85",e.PERCENT_87="pct87",e.PERCENT_90="pct90",e.PERCENT_95="pct95",e.REVERSE_DIAGONAL_STRIPE="reverseDiagStripe",e.SOLID="solid",e.THIN_DIAGONAL_CROSS="thinDiagCross",e.THIN_DIAGONAL_STRIPE="thinDiagStripe",e.THIN_HORIZONTAL_CROSS="thinHorzCross",e.THIN_REVERSE_DIAGONAL_STRIPE="thinReverseDiagStripe",e.THIN_VERTICAL_STRIPE="thinVertStripe",e.VERTICAL_STRIPE="vertStripe"}(E||(E={}));class te extends o{constructor(){super(...arguments),this.xmlKeys={id:"w:id",author:"w:author",date:"w:date"}}}!function(e){e.DOT="dot"}(T||(T={}));class re extends s{constructor(e){super("w:em"),this.root.push(new c({val:e}))}}class ne extends re{constructor(e=T.DOT){super(e)}}class se extends re{constructor(){super(T.DOT)}}class ie extends s{constructor(e){super("w:spacing"),this.root.push(new c({val:(0,N.xb)(e)}))}}class oe extends s{constructor(e){super("w:color"),this.root.push(new c({val:(0,N.dg)(e)}))}}class ae extends s{constructor(e){super("w:highlight"),this.root.push(new c({val:e}))}}class ce extends s{constructor(e){super("w:highlightCs"),this.root.push(new c({val:e}))}}class ue extends o{constructor(){super(...arguments),this.xmlKeys={ascii:"w:ascii",cs:"w:cs",eastAsia:"w:eastAsia",hAnsi:"w:hAnsi",hint:"w:hint"}}}class le extends s{constructor(e,t){if(super("w:rFonts"),"string"==typeof e){const r=e;this.root.push(new ue({ascii:r,cs:r,eastAsia:r,hAnsi:r,hint:t}))}else{const t=e;this.root.push(new ue(t))}}}class he extends s{constructor(e){super("w:vertAlign"),this.root.push(new c({val:e}))}}class pe extends he{constructor(){super("superscript")}}class de extends he{constructor(){super("subscript")}}!function(e){e.SINGLE="single",e.WORDS="words",e.DOUBLE="double",e.THICK="thick",e.DOTTED="dotted",e.DOTTEDHEAVY="dottedHeavy",e.DASH="dash",e.DASHEDHEAVY="dashedHeavy",e.DASHLONG="dashLong",e.DASHLONGHEAVY="dashLongHeavy",e.DOTDASH="dotDash",e.DASHDOTHEAVY="dashDotHeavy",e.DOTDOTDASH="dotDotDash",e.DASHDOTDOTHEAVY="dashDotDotHeavy",e.WAVE="wave",e.WAVYHEAVY="wavyHeavy",e.WAVYDOUBLE="wavyDouble",e.NONE="none"}(A||(A={}));class fe extends s{constructor(e=A.SINGLE,t){super("w:u"),this.root.push(new c({val:e,color:void 0===t?void 0:(0,N.dg)(t)}))}}!function(e){e.BLINK_BACKGROUND="blinkBackground",e.LIGHTS="lights",e.ANTS_BLACK="antsBlack",e.ANTS_RED="antsRed",e.SHIMMER="shimmer",e.SPARKLE="sparkle",e.NONE="none"}(S||(S={}));class me extends i{constructor(e){var t,r;if(super("w:rPr"),!e)return;void 0!==e.bold&&this.push(new R("w:b",e.bold)),(void 0===e.boldComplexScript&&void 0!==e.bold||e.boldComplexScript)&&this.push(new R("w:bCs",null!==(t=e.boldComplexScript)&&void 0!==t?t:e.bold)),void 0!==e.italics&&this.push(new R("w:i",e.italics)),(void 0===e.italicsComplexScript&&void 0!==e.italics||e.italicsComplexScript)&&this.push(new R("w:iCs",null!==(r=e.italicsComplexScript)&&void 0!==r?r:e.italics)),e.underline&&this.push(new fe(e.underline.type,e.underline.color)),e.effect&&this.push(new O("w:effect",e.effect)),e.emphasisMark&&this.push(new ne(e.emphasisMark.type)),e.color&&this.push(new oe(e.color)),e.kern&&this.push(new k("w:kern",e.kern)),e.position&&this.push(new O("w:position",e.position)),void 0!==e.size&&this.push(new k("w:sz",e.size));const n=void 0===e.sizeComplexScript||!0===e.sizeComplexScript?e.size:e.sizeComplexScript;n&&this.push(new k("w:szCs",n)),void 0!==e.rightToLeft&&this.push(new R("w:rtl",e.rightToLeft)),void 0!==e.smallCaps?this.push(new R("w:smallCaps",e.smallCaps)):void 0!==e.allCaps&&this.push(new R("w:caps",e.allCaps)),void 0!==e.strike&&this.push(new R("w:strike",e.strike)),void 0!==e.doubleStrike&&this.push(new R("w:dstrike",e.doubleStrike)),e.subScript&&this.push(new de),e.superScript&&this.push(new pe),e.style&&this.push(new O("w:rStyle",e.style)),e.font&&("string"==typeof e.font?this.push(new le(e.font)):"name"in e.font?this.push(new le(e.font.name,e.font.hint)):this.push(new le(e.font))),e.highlight&&this.push(new ae(e.highlight));const s=void 0===e.highlightComplexScript||!0===e.highlightComplexScript?e.highlight:e.highlightComplexScript;s&&this.push(new ce(s)),e.characterSpacing&&this.push(new ie(e.characterSpacing)),void 0!==e.emboss&&this.push(new R("w:emboss",e.emboss)),void 0!==e.imprint&&this.push(new R("w:imprint",e.imprint)),e.shading&&this.push(new ee(e.shading)),e.revision&&this.push(new we(e.revision)),e.border&&this.push(new U("w:bdr",e.border)),e.snapToGrid&&this.push(new R("w:snapToGrid",e.snapToGrid)),e.vanish&&this.push(new R("w:vanish",e.vanish)),e.specVanish&&this.push(new R("w:specVanish",e.vanish)),void 0!==e.scale&&this.push(new L("w:w",e.scale)),e.language&&this.push((e=>new F({name:"w:lang",attributes:{value:{key:"w:val",value:e.value},eastAsia:{key:"w:eastAsia",value:e.eastAsia},bidirectional:{key:"w:bidi",value:e.bidirectional}}}))(e.language)),e.math&&this.push(new R("w:oMath",e.math))}push(e){this.root.push(e)}}class we extends s{constructor(e){super("w:rPrChange"),this.root.push(new te({id:e.id,author:e.author,date:e.date})),this.addChildElement(new me(e))}}class ge extends s{constructor(e){var t;return super("w:t"),"string"==typeof e?(this.root.push(new q({space:_.PRESERVE})),this.root.push(e),this):(this.root.push(new q({space:null!==(t=e.space)&&void 0!==t?t:_.DEFAULT})),this.root.push(e.text),this)}}!function(e){e.CURRENT="CURRENT",e.TOTAL_PAGES="TOTAL_PAGES",e.TOTAL_PAGES_IN_SECTION="TOTAL_PAGES_IN_SECTION"}(I||(I={}));class ye extends s{constructor(e){if(super("w:r"),this.properties=new me(e),this.root.push(this.properties),e.break)for(let t=0;t<e.break;t++)this.root.push(new G);if(e.children)for(const t of e.children)if("string"!=typeof t)this.root.push(t);else switch(t){case I.CURRENT:this.root.push(new V),this.root.push(new Z),this.root.push(new X),this.root.push(new $);break;case I.TOTAL_PAGES:this.root.push(new V),this.root.push(new Y),this.root.push(new X),this.root.push(new $);break;case I.TOTAL_PAGES_IN_SECTION:this.root.push(new V),this.root.push(new J),this.root.push(new X),this.root.push(new $);break;default:this.root.push(new ge(t))}else e.text&&this.root.push(new ge(e.text))}}class be extends ye{constructor(e){if("string"==typeof e)return super({}),this.root.push(new ge(e)),this;super(e)}}class ve extends o{constructor(){super(...arguments),this.xmlKeys={char:"w:char",symbolfont:"w:font"}}}class xe extends s{constructor(e="",t="Wingdings"){super("w:sym"),this.root.push(new ve({char:e,symbolfont:t}))}}class _e extends ye{constructor(e){if("string"==typeof e)return super({}),this.root.push(new xe(e)),this;super(e),this.root.push(new xe(e.char,e.symbolfont))}}var Ee,Te,Ae=r(5457);!function(e){e.CHARACTER="character",e.COLUMN="column",e.INSIDE_MARGIN="insideMargin",e.LEFT_MARGIN="leftMargin",e.MARGIN="margin",e.OUTSIDE_MARGIN="outsideMargin",e.PAGE="page",e.RIGHT_MARGIN="rightMargin"}(Ee||(Ee={})),function(e){e.BOTTOM_MARGIN="bottomMargin",e.INSIDE_MARGIN="insideMargin",e.LINE="line",e.MARGIN="margin",e.OUTSIDE_MARGIN="outsideMargin",e.PAGE="page",e.PARAGRAPH="paragraph",e.TOP_MARGIN="topMargin"}(Te||(Te={}));class Se extends o{constructor(){super(...arguments),this.xmlKeys={x:"x",y:"y"}}}class Ie extends s{constructor(){super("wp:simplePos"),this.root.push(new Se({x:0,y:0}))}}class Ne extends s{constructor(e){super("wp:align"),this.root.push(e)}}class Re extends s{constructor(e){super("wp:posOffset"),this.root.push(e.toString())}}class ke extends o{constructor(){super(...arguments),this.xmlKeys={relativeFrom:"relativeFrom"}}}class Ce extends s{constructor(e){if(super("wp:positionH"),this.root.push(new ke({relativeFrom:e.relative||Ee.PAGE})),e.align)this.root.push(new Ne(e.align));else{if(void 0===e.offset)throw new Error("There is no configuration provided for floating position (Align or offset)");this.root.push(new Re(e.offset))}}}class Oe extends o{constructor(){super(...arguments),this.xmlKeys={relativeFrom:"relativeFrom"}}}class Le extends s{constructor(e){if(super("wp:positionV"),this.root.push(new Oe({relativeFrom:e.relative||Te.PAGE})),e.align)this.root.push(new Ne(e.align));else{if(void 0===e.offset)throw new Error("There is no configuration provided for floating position (Align or offset)");this.root.push(new Re(e.offset))}}}class De extends o{constructor(){super(...arguments),this.xmlKeys={uri:"uri"}}}class Pe extends o{constructor(){super(...arguments),this.xmlKeys={embed:"r:embed",cstate:"cstate"}}}class Fe extends s{constructor(e){super("a:blip"),this.root.push(new Pe({embed:`rId{${e.fileName}}`,cstate:"none"}))}}class Be extends s{constructor(){super("a:srcRect")}}class Me extends s{constructor(){super("a:fillRect")}}class Ue extends s{constructor(){super("a:stretch"),this.root.push(new Me)}}class He extends s{constructor(e){super("pic:blipFill"),this.root.push(new Fe(e)),this.root.push(new Be),this.root.push(new Ue)}}class je extends o{constructor(){super(...arguments),this.xmlKeys={noChangeAspect:"noChangeAspect",noChangeArrowheads:"noChangeArrowheads"}}}class ze extends s{constructor(){super("a:picLocks"),this.root.push(new je({noChangeAspect:1,noChangeArrowheads:1}))}}class We extends s{constructor(){super("pic:cNvPicPr"),this.root.push(new ze)}}const Ge=(e,t)=>new F({name:"a:hlinkClick",attributes:Object.assign(Object.assign({},t?{xmlns:{key:"xmlns:a",value:"http://schemas.openxmlformats.org/drawingml/2006/main"}}:{}),{id:{key:"r:id",value:`rId${e}`}})});class Ke extends o{constructor(){super(...arguments),this.xmlKeys={id:"id",name:"name",descr:"descr"}}}class Ve extends s{constructor(){super("pic:cNvPr"),this.root.push(new Ke({id:0,name:"",descr:""}))}prepForXml(e){for(let t=e.stack.length-1;t>=0;t--){const r=e.stack[t];if(r instanceof Zr){this.root.push(Ge(r.linkId,!1));break}}return super.prepForXml(e)}}class Xe extends s{constructor(){super("pic:nvPicPr"),this.root.push(new Ve),this.root.push(new We)}}class $e extends o{constructor(){super(...arguments),this.xmlKeys={xmlns:"xmlns:pic"}}}class qe extends o{constructor(){super(...arguments),this.xmlKeys={cx:"cx",cy:"cy"}}}class Ze extends s{constructor(e,t){super("a:ext"),this.attributes=new qe({cx:e,cy:t}),this.root.push(this.attributes)}}class Ye extends o{constructor(){super(...arguments),this.xmlKeys={x:"x",y:"y"}}}class Je extends s{constructor(){super("a:off"),this.root.push(new Ye({x:0,y:0}))}}class Qe extends o{constructor(){super(...arguments),this.xmlKeys={flipVertical:"flipV",flipHorizontal:"flipH",rotation:"rot"}}}class et extends s{constructor(e){var t,r;super("a:xfrm"),this.root.push(new Qe({flipVertical:null===(t=e.flip)||void 0===t?void 0:t.vertical,flipHorizontal:null===(r=e.flip)||void 0===r?void 0:r.horizontal,rotation:e.rotation})),this.extents=new Ze(e.emus.x,e.emus.y),this.root.push(new Je),this.root.push(this.extents)}}class tt extends s{constructor(){super("a:avLst")}}class rt extends o{constructor(){super(...arguments),this.xmlKeys={prst:"prst"}}}class nt extends s{constructor(){super("a:prstGeom"),this.root.push(new rt({prst:"rect"})),this.root.push(new tt)}}class st extends o{constructor(){super(...arguments),this.xmlKeys={bwMode:"bwMode"}}}class it extends s{constructor(e){super("pic:spPr"),this.root.push(new st({bwMode:"auto"})),this.form=new et(e),this.root.push(this.form),this.root.push(new nt)}}class ot extends s{constructor(e,t){super("pic:pic"),this.root.push(new $e({xmlns:"http://schemas.openxmlformats.org/drawingml/2006/picture"})),this.root.push(new Xe),this.root.push(new He(e)),this.root.push(new it(t))}}class at extends s{constructor(e,t){super("a:graphicData"),this.root.push(new De({uri:"http://schemas.openxmlformats.org/drawingml/2006/picture"})),this.pic=new ot(e,t),this.root.push(this.pic)}}class ct extends o{constructor(){super(...arguments),this.xmlKeys={a:"xmlns:a"}}}class ut extends s{constructor(e,t){super("a:graphic"),this.root.push(new ct({a:"http://schemas.openxmlformats.org/drawingml/2006/main"})),this.data=new at(e,t),this.root.push(this.data)}}var lt,ht,pt,dt,ft,mt,wt,gt,yt,bt,vt,xt,_t,Et,Tt,At,St,It,Nt,Rt,kt,Ct,Ot,Lt,Dt;!function(e){e[e.NONE=0]="NONE",e[e.SQUARE=1]="SQUARE",e[e.TIGHT=2]="TIGHT",e[e.TOP_AND_BOTTOM=3]="TOP_AND_BOTTOM"}(lt||(lt={})),function(e){e.BOTH_SIDES="bothSides",e.LEFT="left",e.RIGHT="right",e.LARGEST="largest"}(ht||(ht={}));class Pt extends s{constructor(){super("wp:wrapNone")}}class Ft extends o{constructor(){super(...arguments),this.xmlKeys={distT:"distT",distB:"distB",distL:"distL",distR:"distR",wrapText:"wrapText"}}}class Bt extends s{constructor(e,t={top:0,bottom:0,left:0,right:0}){super("wp:wrapSquare"),this.root.push(new Ft({wrapText:e.side||ht.BOTH_SIDES,distT:t.top,distB:t.bottom,distL:t.left,distR:t.right}))}}class Mt extends o{constructor(){super(...arguments),this.xmlKeys={distT:"distT",distB:"distB"}}}class Ut extends s{constructor(e={top:0,bottom:0}){super("wp:wrapTight"),this.root.push(new Mt({distT:e.top,distB:e.bottom}))}}class Ht extends o{constructor(){super(...arguments),this.xmlKeys={distT:"distT",distB:"distB"}}}class jt extends s{constructor(e={top:0,bottom:0}){super("wp:wrapTopAndBottom"),this.root.push(new Ht({distT:e.top,distB:e.bottom}))}}class zt extends s{constructor({name:e,description:t,title:r}={name:"",description:"",title:""}){super("wp:docPr"),this.root.push(new a({id:{key:"id",value:(0,Ae.Nm)()},name:{key:"name",value:e},description:{key:"descr",value:t},title:{key:"title",value:r}}))}prepForXml(e){for(let t=e.stack.length-1;t>=0;t--){const r=e.stack[t];if(r instanceof Zr){this.root.push(Ge(r.linkId,!0));break}}return super.prepForXml(e)}}class Wt extends o{constructor(){super(...arguments),this.xmlKeys={b:"b",l:"l",r:"r",t:"t"}}}class Gt extends s{constructor(){super("wp:effectExtent"),this.root.push(new Wt({b:0,l:0,r:0,t:0}))}}class Kt extends o{constructor(){super(...arguments),this.xmlKeys={cx:"cx",cy:"cy"}}}class Vt extends s{constructor(e,t){super("wp:extent"),this.attributes=new Kt({cx:e,cy:t}),this.root.push(this.attributes)}}class Xt extends o{constructor(){super(...arguments),this.xmlKeys={xmlns:"xmlns:a",noChangeAspect:"noChangeAspect"}}}class $t extends s{constructor(){super("a:graphicFrameLocks"),this.root.push(new Xt({xmlns:"http://schemas.openxmlformats.org/drawingml/2006/main",noChangeAspect:1}))}}class qt extends s{constructor(){super("wp:cNvGraphicFramePr"),this.root.push(new $t)}}class Zt extends o{constructor(){super(...arguments),this.xmlKeys={distT:"distT",distB:"distB",distL:"distL",distR:"distR",allowOverlap:"allowOverlap",behindDoc:"behindDoc",layoutInCell:"layoutInCell",locked:"locked",relativeHeight:"relativeHeight",simplePos:"simplePos"}}}class Yt extends s{constructor(e,t,r){super("wp:anchor");const n=Object.assign({allowOverlap:!0,behindDocument:!1,lockAnchor:!1,layoutInCell:!0,verticalPosition:{},horizontalPosition:{}},r.floating);if(this.root.push(new Zt({distT:n.margins&&n.margins.top||0,distB:n.margins&&n.margins.bottom||0,distL:n.margins&&n.margins.left||0,distR:n.margins&&n.margins.right||0,simplePos:"0",allowOverlap:!0===n.allowOverlap?"1":"0",behindDoc:!0===n.behindDocument?"1":"0",locked:!0===n.lockAnchor?"1":"0",layoutInCell:!0===n.layoutInCell?"1":"0",relativeHeight:n.zIndex?n.zIndex:t.emus.y})),this.root.push(new Ie),this.root.push(new Ce(n.horizontalPosition)),this.root.push(new Le(n.verticalPosition)),this.root.push(new Vt(t.emus.x,t.emus.y)),this.root.push(new Gt),void 0!==r.floating&&void 0!==r.floating.wrap)switch(r.floating.wrap.type){case lt.SQUARE:this.root.push(new Bt(r.floating.wrap,r.floating.margins));break;case lt.TIGHT:this.root.push(new Ut(r.floating.margins));break;case lt.TOP_AND_BOTTOM:this.root.push(new jt(r.floating.margins));break;case lt.NONE:default:this.root.push(new Pt)}else this.root.push(new Pt);this.root.push(new zt(r.docProperties)),this.root.push(new qt),this.root.push(new ut(e,t))}}class Jt extends o{constructor(){super(...arguments),this.xmlKeys={distT:"distT",distB:"distB",distL:"distL",distR:"distR"}}}class Qt extends s{constructor({mediaData:e,transform:t,docProperties:r}){super("wp:inline"),this.root.push(new Jt({distT:0,distB:0,distL:0,distR:0})),this.extent=new Vt(t.emus.x,t.emus.y),this.graphic=new ut(e,t),this.root.push(this.extent),this.root.push(new Gt),this.root.push(new zt(r)),this.root.push(new qt),this.root.push(this.graphic)}}class er extends s{constructor(e,t={}){super("w:drawing"),t.floating?this.root.push(new Yt(e,e.transformation,t)):(this.inline=new Qt({mediaData:e,transform:e.transformation,docProperties:t.docProperties}),this.root.push(this.inline))}}class tr extends ye{constructor(e){super({}),this.key=`${(0,Ae.EL)()}.png`;const t="string"==typeof e.data?this.convertDataURIToBinary(e.data):e.data;this.imageData={stream:t,fileName:this.key,transformation:{pixels:{x:Math.round(e.transformation.width),y:Math.round(e.transformation.height)},emus:{x:Math.round(9525*e.transformation.width),y:Math.round(9525*e.transformation.height)},flip:e.transformation.flip,rotation:e.transformation.rotation?6e4*e.transformation.rotation:void 0}};const r=new er(this.imageData,{floating:e.floating,docProperties:e.altText});this.root.push(r)}prepForXml(e){return e.file.Media.addImage(this.key,this.imageData),super.prepForXml(e)}convertDataURIToBinary(e){if("function"==typeof atob){const t=";base64,",r=e.indexOf(t),n=-1===r?0:r+t.length;return new Uint8Array(atob(e.substring(n)).split("").map((e=>e.charCodeAt(0))))}return new(r(8764).Buffer)(e,"base64")}}class rr extends s{constructor(e){super("w:instrText"),this.root.push(new q({space:_.PRESERVE})),this.root.push(`SEQ ${e}`)}}class nr extends ye{constructor(e){super({}),this.root.push(new V(!0)),this.root.push(new rr(e)),this.root.push(new X),this.root.push(new $)}}class sr extends o{constructor(){super(...arguments),this.xmlKeys={instr:"w:instr"}}}class ir extends s{constructor(e,t){super("w:fldSimple"),this.root.push(new sr({instr:e})),void 0!==t&&this.root.push(new be(t))}}class or extends ir{constructor(e){super(` MERGEFIELD ${e} `,`«${e}»`)}}class ar extends o{constructor(){super(...arguments),this.xmlKeys={id:"w:id",initials:"w:initials",author:"w:author",date:"w:date"}}}class cr extends o{constructor(){super(...arguments),this.xmlKeys={id:"w:id"}}}class ur extends o{constructor(){super(...arguments),this.xmlKeys={"xmlns:cx":"xmlns:cx","xmlns:cx1":"xmlns:cx1","xmlns:cx2":"xmlns:cx2","xmlns:cx3":"xmlns:cx3","xmlns:cx4":"xmlns:cx4","xmlns:cx5":"xmlns:cx5","xmlns:cx6":"xmlns:cx6","xmlns:cx7":"xmlns:cx7","xmlns:cx8":"xmlns:cx8","xmlns:mc":"xmlns:mc","xmlns:aink":"xmlns:aink","xmlns:am3d":"xmlns:am3d","xmlns:o":"xmlns:o","xmlns:r":"xmlns:r","xmlns:m":"xmlns:m","xmlns:v":"xmlns:v","xmlns:wp14":"xmlns:wp14","xmlns:wp":"xmlns:wp","xmlns:w10":"xmlns:w10","xmlns:w":"xmlns:w","xmlns:w14":"xmlns:w14","xmlns:w15":"xmlns:w15","xmlns:w16cex":"xmlns:w16cex","xmlns:w16cid":"xmlns:w16cid","xmlns:w16":"xmlns:w16","xmlns:w16sdtdh":"xmlns:w16sdtdh","xmlns:w16se":"xmlns:w16se","xmlns:wpg":"xmlns:wpg","xmlns:wpi":"xmlns:wpi","xmlns:wne":"xmlns:wne","xmlns:wps":"xmlns:wps"}}}class lr extends s{constructor(e){super("w:commentRangeStart"),this.root.push(new cr({id:e}))}}class hr extends s{constructor(e){super("w:commentRangeEnd"),this.root.push(new cr({id:e}))}}class pr extends s{constructor(e){super("w:commentReference"),this.root.push(new cr({id:e}))}}class dr extends s{constructor({id:e,initials:t,author:r,date:n=new Date,children:s}){super("w:comment"),this.root.push(new ar({id:e,initials:t,author:r,date:n.toISOString()}));for(const e of s)this.root.push(e)}}class fr extends s{constructor({children:e}){super("w:comments"),this.root.push(new ur({"xmlns:cx":"http://schemas.microsoft.com/office/drawing/2014/chartex","xmlns:cx1":"http://schemas.microsoft.com/office/drawing/2015/9/8/chartex","xmlns:cx2":"http://schemas.microsoft.com/office/drawing/2015/10/21/chartex","xmlns:cx3":"http://schemas.microsoft.com/office/drawing/2016/5/9/chartex","xmlns:cx4":"http://schemas.microsoft.com/office/drawing/2016/5/10/chartex","xmlns:cx5":"http://schemas.microsoft.com/office/drawing/2016/5/11/chartex","xmlns:cx6":"http://schemas.microsoft.com/office/drawing/2016/5/12/chartex","xmlns:cx7":"http://schemas.microsoft.com/office/drawing/2016/5/13/chartex","xmlns:cx8":"http://schemas.microsoft.com/office/drawing/2016/5/14/chartex","xmlns:mc":"http://schemas.openxmlformats.org/markup-compatibility/2006","xmlns:aink":"http://schemas.microsoft.com/office/drawing/2016/ink","xmlns:am3d":"http://schemas.microsoft.com/office/drawing/2017/model3d","xmlns:o":"urn:schemas-microsoft-com:office:office","xmlns:r":"http://schemas.openxmlformats.org/officeDocument/2006/relationships","xmlns:m":"http://schemas.openxmlformats.org/officeDocument/2006/math","xmlns:v":"urn:schemas-microsoft-com:vml","xmlns:wp14":"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing","xmlns:wp":"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing","xmlns:w10":"urn:schemas-microsoft-com:office:word","xmlns:w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main","xmlns:w14":"http://schemas.microsoft.com/office/word/2010/wordml","xmlns:w15":"http://schemas.microsoft.com/office/word/2012/wordml","xmlns:w16cex":"http://schemas.microsoft.com/office/word/2018/wordml/cex","xmlns:w16cid":"http://schemas.microsoft.com/office/word/2016/wordml/cid","xmlns:w16":"http://schemas.microsoft.com/office/word/2018/wordml","xmlns:w16sdtdh":"http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash","xmlns:w16se":"http://schemas.microsoft.com/office/word/2015/wordml/symex","xmlns:wpg":"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup","xmlns:wpi":"http://schemas.microsoft.com/office/word/2010/wordprocessingInk","xmlns:wne":"http://schemas.microsoft.com/office/word/2006/wordml","xmlns:wps":"http://schemas.microsoft.com/office/word/2010/wordprocessingShape"}));for(const t of e)this.root.push(new dr(t))}}class mr extends C{constructor(){super("w:noBreakHyphen")}}class wr extends C{constructor(){super("w:softHyphen")}}class gr extends C{constructor(){super("w:dayShort")}}class yr extends C{constructor(){super("w:monthShort")}}class br extends C{constructor(){super("w:yearShort")}}class vr extends C{constructor(){super("w:dayLong")}}class xr extends C{constructor(){super("w:monthLong")}}class _r extends C{constructor(){super("w:yearLong")}}class Er extends C{constructor(){super("w:annotationRef")}}class Tr extends C{constructor(){super("w:footnoteRef")}}class Ar extends C{constructor(){super("w:endnoteRef")}}class Sr extends C{constructor(){super("w:separator")}}class Ir extends C{constructor(){super("w:continuationSeparator")}}class Nr extends C{constructor(){super("w:pgNum")}}class Rr extends C{constructor(){super("w:cr")}}class kr extends C{constructor(){super("w:tab")}}class Cr extends C{constructor(){super("w:lastRenderedPageBreak")}}!function(e){e.LEFT="left",e.CENTER="center",e.RIGHT="right"}(pt||(pt={})),function(e){e.MARGIN="margin",e.INDENT="indent"}(dt||(dt={})),function(e){e.NONE="none",e.DOT="dot",e.HYPHEN="hyphen",e.UNDERSCORE="underscore",e.MIDDLE_DOT="middleDot"}(ft||(ft={}));class Or extends s{constructor(e){super("w:ptab"),this.root.push(new a({alignment:{key:"w:alignment",value:e.alignment},relativeTo:{key:"w:relativeTo",value:e.relativeTo},leader:{key:"w:leader",value:e.leader}}))}}!function(e){e.COLUMN="column",e.PAGE="page"}(mt||(mt={}));class Lr extends s{constructor(e){super("w:br"),this.root.push(new c({type:e}))}}class Dr extends ye{constructor(){super({}),this.root.push(new Lr(mt.PAGE))}}class Pr extends ye{constructor(){super({}),this.root.push(new Lr(mt.COLUMN))}}class Fr extends s{constructor(){super("w:pageBreakBefore")}}!function(e){e.AT_LEAST="atLeast",e.EXACTLY="exactly",e.EXACT="exact",e.AUTO="auto"}(wt||(wt={}));class Br extends o{constructor(){super(...arguments),this.xmlKeys={after:"w:after",before:"w:before",line:"w:line",lineRule:"w:lineRule"}}}class Mr extends s{constructor(e){super("w:spacing"),this.root.push(new Br(e))}}!function(e){e.HEADING_1="Heading1",e.HEADING_2="Heading2",e.HEADING_3="Heading3",e.HEADING_4="Heading4",e.HEADING_5="Heading5",e.HEADING_6="Heading6",e.TITLE="Title"}(gt||(gt={}));class Ur extends s{constructor(e){super("w:pStyle"),this.root.push(new c({val:e}))}}class Hr extends s{constructor(e){super("w:tabs");for(const t of e)this.root.push(new zr(t))}}!function(e){e.LEFT="left",e.RIGHT="right",e.CENTER="center",e.BAR="bar",e.CLEAR="clear",e.DECIMAL="decimal",e.END="end",e.NUM="num",e.START="start"}(yt||(yt={})),function(e){e.DOT="dot",e.HYPHEN="hyphen",e.MIDDLE_DOT="middleDot",e.NONE="none",e.UNDERSCORE="underscore"}(bt||(bt={})),function(e){e[e.MAX=9026]="MAX"}(vt||(vt={}));class jr extends o{constructor(){super(...arguments),this.xmlKeys={val:"w:val",pos:"w:pos",leader:"w:leader"}}}class zr extends s{constructor({type:e,position:t,leader:r}){super("w:tab"),this.root.push(new jr({val:e,pos:t,leader:r}))}}class Wr extends s{constructor(e,t){super("w:numPr"),this.root.push(new Gr(t)),this.root.push(new Kr(e))}}class Gr extends s{constructor(e){if(super("w:ilvl"),e>9)throw new Error("Level cannot be greater than 9. Read more here: https://answers.microsoft.com/en-us/msoffice/forum/all/does-word-support-more-than-9-list-levels/d130fdcd-1781-446d-8c84-c6c79124e4d7");this.root.push(new c({val:e}))}}class Kr extends s{constructor(e){super("w:numId"),this.root.push(new c({val:"string"==typeof e?`{${e}}`:e}))}}class Vr extends s{constructor(){super(...arguments),this.fileChild=Symbol()}}class Xr extends o{constructor(){super(...arguments),this.xmlKeys={id:"Id",type:"Type",target:"Target",targetMode:"TargetMode"}}}!function(e){e.EXTERNAL="External"}(xt||(xt={}));class $r extends s{constructor(e,t,r,n){super("Relationship"),this.root.push(new Xr({id:e,type:t,target:r,targetMode:n}))}}class qr extends o{constructor(){super(...arguments),this.xmlKeys={id:"r:id",history:"w:history",anchor:"w:anchor"}}}!function(e){e.INTERNAL="INTERNAL",e.EXTERNAL="EXTERNAL"}(_t||(_t={}));class Zr extends s{constructor(e,t,r){super("w:hyperlink"),this.linkId=t;const n={history:1,anchor:r||void 0,id:r?void 0:`rId${this.linkId}`},s=new qr(n);this.root.push(s),e.forEach((e=>{this.root.push(e)}))}}class Yr extends Zr{constructor(e){super(e.children,(0,Ae.EL)(),e.anchor)}}class Jr extends s{constructor(e){super("w:externalHyperlink"),this.options=e}}class Qr extends o{constructor(){super(...arguments),this.xmlKeys={id:"w:id",name:"w:name"}}}class en extends o{constructor(){super(...arguments),this.xmlKeys={id:"w:id"}}}class tn{constructor(e){const t=(0,Ae.G6)();this.start=new rn(e.id,t),this.children=e.children,this.end=new nn(t)}}class rn extends s{constructor(e,t){super("w:bookmarkStart");const r=new Qr({name:e,id:t});this.root.push(r)}}class nn extends s{constructor(e){super("w:bookmarkEnd");const t=new en({id:e});this.root.push(t)}}class sn extends s{constructor(e){super("w:outlineLvl"),this.level=e,this.root.push(new c({val:e}))}}class on extends s{constructor(e,t={}){super("w:instrText"),this.root.push(new q({space:_.PRESERVE}));let r=`PAGEREF ${e}`;t.hyperlink&&(r=`${r} \\h`),t.useRelativePosition&&(r=`${r} \\p`),this.root.push(r)}}class an extends ye{constructor(e,t={}){super({children:[new V(!0),new on(e,t),new $]})}}!function(e){e.BOTTOM="bottom",e.CENTER="center",e.TOP="top"}(Et||(Et={}));class cn extends o{constructor(){super(...arguments),this.xmlKeys={verticalAlign:"w:val"}}}class un extends s{constructor(e){super("w:vAlign"),this.root.push(new cn({verticalAlign:e}))}}!function(e){e.DEFAULT="default",e.FIRST="first",e.EVEN="even"}(Tt||(Tt={}));class ln extends o{constructor(){super(...arguments),this.xmlKeys={type:"w:type",id:"r:id"}}}!function(e){e.HEADER="w:headerReference",e.FOOTER="w:footerReference"}(At||(At={}));class hn extends s{constructor(e,t){super(e),this.root.push(new ln({type:t.type||Tt.DEFAULT,id:`rId${t.id}`}))}}class pn extends s{constructor({space:e,count:t,separate:r,equalWidth:n,children:s}){super("w:cols"),this.root.push(new a({space:{key:"w:space",value:void 0===e?void 0:(0,N.Jd)(e)},count:{key:"w:num",value:void 0===t?void 0:(0,N.vH)(t)},separate:{key:"w:sep",value:r},equalWidth:{key:"w:equalWidth",value:n}})),!n&&s&&s.forEach((e=>this.addChildElement(e)))}}!function(e){e.DEFAULT="default",e.LINES="lines",e.LINES_AND_CHARS="linesAndChars",e.SNAP_TO_CHARS="snapToChars"}(St||(St={}));class dn extends o{constructor(){super(...arguments),this.xmlKeys={type:"w:type",linePitch:"w:linePitch",charSpace:"w:charSpace"}}}class fn extends s{constructor(e,t,r){super("w:docGrid"),this.root.push(new dn({type:r,linePitch:(0,N.vH)(e),charSpace:t?(0,N.vH)(t):void 0}))}}!function(e){e.NEW_PAGE="newPage",e.NEW_SECTION="newSection",e.CONTINUOUS="continuous"}(It||(It={}));class mn extends s{constructor({countBy:e,start:t,restart:r,distance:n}){super("w:lnNumType"),this.root.push(new a({countBy:{key:"w:countBy",value:void 0===e?void 0:(0,N.vH)(e)},start:{key:"w:start",value:void 0===t?void 0:(0,N.vH)(t)},restart:{key:"w:restart",value:r},distance:{key:"w:distance",value:void 0===n?void 0:(0,N.Jd)(n)}}))}}!function(e){e.ALL_PAGES="allPages",e.FIRST_PAGE="firstPage",e.NOT_FIRST_PAGE="notFirstPage"}(Nt||(Nt={})),function(e){e.PAGE="page",e.TEXT="text"}(Rt||(Rt={})),function(e){e.BACK="back",e.FRONT="front"}(kt||(kt={}));class wn extends o{constructor(){super(...arguments),this.xmlKeys={display:"w:display",offsetFrom:"w:offsetFrom",zOrder:"w:zOrder"}}}class gn extends i{constructor(e){if(super("w:pgBorders"),!e)return this;e.pageBorders?this.root.push(new wn({display:e.pageBorders.display,offsetFrom:e.pageBorders.offsetFrom,zOrder:e.pageBorders.zOrder})):this.root.push(new wn({})),e.pageBorderTop&&this.root.push(new U("w:top",e.pageBorderTop)),e.pageBorderLeft&&this.root.push(new U("w:left",e.pageBorderLeft)),e.pageBorderBottom&&this.root.push(new U("w:bottom",e.pageBorderBottom)),e.pageBorderRight&&this.root.push(new U("w:right",e.pageBorderRight))}}class yn extends s{constructor(e,t,r,n,s,i,o){super("w:pgMar"),this.root.push(new a({top:{key:"w:top",value:(0,N.xb)(e)},right:{key:"w:right",value:(0,N.Jd)(t)},bottom:{key:"w:bottom",value:(0,N.xb)(r)},left:{key:"w:left",value:(0,N.Jd)(n)},header:{key:"w:header",value:(0,N.Jd)(s)},footer:{key:"w:footer",value:(0,N.Jd)(i)},gutter:{key:"w:gutter",value:(0,N.Jd)(o)}}))}}!function(e){e.HYPHEN="hyphen",e.PERIOD="period",e.COLON="colon",e.EM_DASH="emDash",e.EN_DASH="endash"}(Ct||(Ct={}));class bn extends o{constructor(){super(...arguments),this.xmlKeys={start:"w:start",formatType:"w:fmt",separator:"w:chapSep"}}}class vn extends s{constructor({start:e,formatType:t,separator:r}){super("w:pgNumType"),this.root.push(new bn({start:void 0===e?void 0:(0,N.vH)(e),formatType:t,separator:r}))}}!function(e){e.PORTRAIT="portrait",e.LANDSCAPE="landscape"}(Ot||(Ot={}));class xn extends s{constructor(e,t,r){super("w:pgSz");const n=r===Ot.LANDSCAPE,s=(0,N.Jd)(e),i=(0,N.Jd)(t);this.root.push(new a({width:{key:"w:w",value:n?i:s},height:{key:"w:h",value:n?s:i},orientation:{key:"w:orient",value:r}}))}}!function(e){e.LEFT_TO_RIGHT_TOP_TO_BOTTOM="lrTb",e.TOP_TO_BOTTOM_RIGHT_TO_LEFT="tbRl"}(Lt||(Lt={}));class _n extends o{constructor(){super(...arguments),this.xmlKeys={val:"w:val"}}}class En extends s{constructor(e){super("w:textDirection"),this.root.push(new _n({val:e}))}}!function(e){e.NEXT_PAGE="nextPage",e.NEXT_COLUMN="nextColumn",e.CONTINUOUS="continuous",e.EVEN_PAGE="evenPage",e.ODD_PAGE="oddPage"}(Dt||(Dt={}));class Tn extends o{constructor(){super(...arguments),this.xmlKeys={val:"w:val"}}}class An extends s{constructor(e){super("w:type"),this.root.push(new Tn({val:e}))}}const Sn={TOP:"1in",RIGHT:"1in",BOTTOM:"1in",LEFT:"1in",HEADER:708,FOOTER:708,GUTTER:0},In={WIDTH:11906,HEIGHT:16838,ORIENTATION:Ot.PORTRAIT};class Nn extends s{constructor({page:{size:{width:e=In.WIDTH,height:t=In.HEIGHT,orientation:r=In.ORIENTATION}={},margin:{top:n=Sn.TOP,right:s=Sn.RIGHT,bottom:i=Sn.BOTTOM,left:o=Sn.LEFT,header:a=Sn.HEADER,footer:c=Sn.FOOTER,gutter:u=Sn.GUTTER}={},pageNumbers:l={},borders:h,textDirection:p}={},grid:{linePitch:d=360,charSpace:f,type:m}={},headerWrapperGroup:w={},footerWrapperGroup:g={},lineNumbers:y,titlePage:b,verticalAlign:v,column:x,type:_}={}){super("w:sectPr"),this.addHeaderFooterGroup(At.HEADER,w),this.addHeaderFooterGroup(At.FOOTER,g),_&&this.root.push(new An(_)),this.root.push(new xn(e,t,r)),this.root.push(new yn(n,s,i,o,a,c,u)),h&&this.root.push(new gn(h)),y&&this.root.push(new mn(y)),this.root.push(new vn(l)),x&&this.root.push(new pn(x)),v&&this.root.push(new un(v)),void 0!==b&&this.root.push(new R("w:titlePg",b)),p&&this.root.push(new En(p)),this.root.push(new fn(d,f,m))}addHeaderFooterGroup(e,t){t.default&&this.root.push(new hn(e,{type:Tt.DEFAULT,id:t.default.View.ReferenceId})),t.first&&this.root.push(new hn(e,{type:Tt.FIRST,id:t.first.View.ReferenceId})),t.even&&this.root.push(new hn(e,{type:Tt.EVEN,id:t.even.View.ReferenceId}))}}class Rn extends s{constructor(){super("w:body"),this.sections=[]}addSection(e){const t=this.sections.pop();this.root.push(this.createSectionParagraph(t)),this.sections.push(new Nn(e))}prepForXml(e){return 1===this.sections.length&&(this.root.splice(0,1),this.root.push(this.sections.pop())),super.prepForXml(e)}push(e){this.root.push(e)}createSectionParagraph(e){const t=new Vn({}),r=new Kn({});return r.push(e),t.addChildElement(r),t}}class kn extends s{constructor({width:e,space:t}){super("w:col"),this.root.push(new a({width:{key:"w:w",value:(0,N.Jd)(e)},space:{key:"w:space",value:void 0===t?void 0:(0,N.Jd)(t)}}))}}class Cn extends o{constructor(){super(...arguments),this.xmlKeys={wpc:"xmlns:wpc",mc:"xmlns:mc",o:"xmlns:o",r:"xmlns:r",m:"xmlns:m",v:"xmlns:v",wp14:"xmlns:wp14",wp:"xmlns:wp",w10:"xmlns:w10",w:"xmlns:w",w14:"xmlns:w14",w15:"xmlns:w15",wpg:"xmlns:wpg",wpi:"xmlns:wpi",wne:"xmlns:wne",wps:"xmlns:wps",Ignorable:"mc:Ignorable",cp:"xmlns:cp",dc:"xmlns:dc",dcterms:"xmlns:dcterms",dcmitype:"xmlns:dcmitype",xsi:"xmlns:xsi",type:"xsi:type",cx:"xmlns:cx",cx1:"xmlns:cx1",cx2:"xmlns:cx2",cx3:"xmlns:cx3",cx4:"xmlns:cx4",cx5:"xmlns:cx5",cx6:"xmlns:cx6",cx7:"xmlns:cx7",cx8:"xmlns:cx8",aink:"xmlns:aink",am3d:"xmlns:am3d",w16cex:"xmlns:w16cex",w16cid:"xmlns:w16cid",w16:"xmlns:w16",w16sdtdh:"xmlns:w16sdtdh",w16se:"xmlns:w16se"}}}class On extends o{constructor(){super(...arguments),this.xmlKeys={color:"w:color",themeColor:"w:themeColor",themeShade:"w:themeShade",themeTint:"w:themeTint"}}}class Ln extends s{constructor(e){super("w:background"),this.root.push(new On({color:void 0===e.color?void 0:(0,N.dg)(e.color),themeColor:e.themeColor,themeShade:void 0===e.themeShade?void 0:(0,N.xD)(e.themeShade),themeTint:void 0===e.themeTint?void 0:(0,N.xD)(e.themeTint)}))}}class Dn extends s{constructor(e){super("w:document"),this.root.push(new Cn({wpc:"http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",mc:"http://schemas.openxmlformats.org/markup-compatibility/2006",o:"urn:schemas-microsoft-com:office:office",r:"http://schemas.openxmlformats.org/officeDocument/2006/relationships",m:"http://schemas.openxmlformats.org/officeDocument/2006/math",v:"urn:schemas-microsoft-com:vml",wp14:"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",wp:"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",w10:"urn:schemas-microsoft-com:office:word",w:"http://schemas.openxmlformats.org/wordprocessingml/2006/main",w14:"http://schemas.microsoft.com/office/word/2010/wordml",w15:"http://schemas.microsoft.com/office/word/2012/wordml",wpg:"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",wpi:"http://schemas.microsoft.com/office/word/2010/wordprocessingInk",wne:"http://schemas.microsoft.com/office/word/2006/wordml",wps:"http://schemas.microsoft.com/office/word/2010/wordprocessingShape",cx:"http://schemas.microsoft.com/office/drawing/2014/chartex",cx1:"http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",cx2:"http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",cx3:"http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",cx4:"http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",cx5:"http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",cx6:"http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",cx7:"http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",cx8:"http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",aink:"http://schemas.microsoft.com/office/drawing/2016/ink",am3d:"http://schemas.microsoft.com/office/drawing/2017/model3d",w16cex:"http://schemas.microsoft.com/office/word/2018/wordml/cex",w16cid:"http://schemas.microsoft.com/office/word/2016/wordml/cid",w16:"http://schemas.microsoft.com/office/word/2018/wordml",w16sdtdh:"http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash",w16se:"http://schemas.microsoft.com/office/word/2015/wordml/symex",Ignorable:"w14 w15 wp14"})),this.body=new Rn,e.background&&this.root.push(new Ln(e.background)),this.root.push(this.body)}add(e){return this.body.push(e),this}get Body(){return this.body}}class Pn extends o{constructor(){super(...arguments),this.xmlKeys={xmlns:"xmlns"}}}class Fn extends s{constructor(){super("Relationships"),this.root.push(new Pn({xmlns:"http://schemas.openxmlformats.org/package/2006/relationships"}))}createRelationship(e,t,r,n){const s=new $r(`rId${e}`,t,r,n);return this.root.push(s),s}get RelationshipCount(){return this.root.length-1}}class Bn{constructor(e){this.document=new Dn(e),this.relationships=new Fn}get View(){return this.document}get Relationships(){return this.relationships}}class Mn extends o{constructor(){super(...arguments),this.xmlKeys={val:"w:val"}}}class Un extends s{constructor(){super("w:wordWrap"),this.root.push(new Mn({val:0}))}}var Hn,jn,zn;!function(e){e.NONE="none",e.DROP="drop",e.MARGIN="margin"}(Hn||(Hn={})),function(e){e.MARGIN="margin",e.PAGE="page",e.TEXT="text"}(jn||(jn={})),function(e){e.AROUND="around",e.AUTO="auto",e.NONE="none",e.NOT_BESIDE="notBeside",e.THROUGH="through",e.TIGHT="tight"}(zn||(zn={}));class Wn extends o{constructor(){super(...arguments),this.xmlKeys={anchorLock:"w:anchorLock",dropCap:"w:dropCap",width:"w:w",height:"w:h",x:"w:x",y:"w:y",anchorHorizontal:"w:hAnchor",anchorVertical:"w:vAnchor",spaceHorizontal:"w:hSpace",spaceVertical:"w:vSpace",rule:"w:hRule",alignmentX:"w:xAlign",alignmentY:"w:yAlign",lines:"w:lines",wrap:"w:wrap"}}}class Gn extends s{constructor(e){var t,r;super("w:framePr"),this.root.push(new Wn({anchorLock:e.anchorLock,dropCap:e.dropCap,width:e.width,height:e.height,x:e.position?e.position.x:void 0,y:e.position?e.position.y:void 0,anchorHorizontal:e.anchor.horizontal,anchorVertical:e.anchor.vertical,spaceHorizontal:null===(t=e.space)||void 0===t?void 0:t.horizontal,spaceVertical:null===(r=e.space)||void 0===r?void 0:r.vertical,rule:e.rule,alignmentX:e.alignment?e.alignment.x:void 0,alignmentY:e.alignment?e.alignment.y:void 0,lines:e.lines,wrap:e.wrap}))}}class Kn extends i{constructor(e){var t,r;if(super("w:pPr"),this.numberingReferences=[],!e)return this;e.heading&&this.push(new Ur(e.heading)),e.bullet&&this.push(new Ur("ListParagraph")),e.numbering&&(e.style||e.heading||e.numbering.custom||this.push(new Ur("ListParagraph"))),e.style&&this.push(new Ur(e.style)),void 0!==e.keepNext&&this.push(new R("w:keepNext",e.keepNext)),void 0!==e.keepLines&&this.push(new R("w:keepLines",e.keepLines)),e.pageBreakBefore&&this.push(new Fr),e.frame&&this.push(new Gn(e.frame)),void 0!==e.widowControl&&this.push(new R("w:widowControl",e.widowControl)),e.bullet&&this.push(new Wr(1,e.bullet.level)),e.numbering&&(this.numberingReferences.push({reference:e.numbering.reference,instance:null!==(t=e.numbering.instance)&&void 0!==t?t:0}),this.push(new Wr(`${e.numbering.reference}-${null!==(r=e.numbering.instance)&&void 0!==r?r:0}`,e.numbering.level))),e.border&&this.push(new j(e.border)),e.thematicBreak&&this.push(new z),e.shading&&this.push(new ee(e.shading)),e.wordWrap&&this.push(new Un);const n=[...e.rightTabStop?[{type:yt.RIGHT,position:e.rightTabStop}]:[],...e.tabStops?e.tabStops:[],...e.leftTabStop?[{type:yt.LEFT,position:e.leftTabStop}]:[]];n.length>0&&this.push(new Hr(n)),void 0!==e.bidirectional&&this.push(new R("w:bidi",e.bidirectional)),e.spacing&&this.push(new Mr(e.spacing)),e.indent&&this.push(new W(e.indent)),void 0!==e.contextualSpacing&&this.push(new R("w:contextualSpacing",e.contextualSpacing)),e.alignment&&this.push(new M(e.alignment)),void 0!==e.outlineLevel&&this.push(new sn(e.outlineLevel)),void 0!==e.suppressLineNumbers&&this.push(new R("w:suppressLineNumbers",e.suppressLineNumbers)),void 0!==e.autoSpaceEastAsianText&&this.push(new R("w:autoSpaceDN",e.autoSpaceEastAsianText))}push(e){this.root.push(e)}prepForXml(e){if(e.viewWrapper instanceof Bn)for(const t of this.numberingReferences)e.file.Numbering.createConcreteNumberingInstance(t.reference,t.instance);return super.prepForXml(e)}}class Vn extends Vr{constructor(e){if(super("w:p"),"string"==typeof e)return this.properties=new Kn({}),this.root.push(this.properties),this.root.push(new be(e)),this;if(this.properties=new Kn(e),this.root.push(this.properties),e.text&&this.root.push(new be(e.text)),e.children)for(const t of e.children)if(t instanceof tn){this.root.push(t.start);for(const e of t.children)this.root.push(e);this.root.push(t.end)}else this.root.push(t)}prepForXml(e){for(const t of this.root)if(t instanceof Jr){const r=this.root.indexOf(t),n=new Zr(t.options.children,(0,Ae.EL)());e.viewWrapper.Relationships.createRelationship(n.linkId,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",t.options.link,xt.EXTERNAL),this.root[r]=n}return super.prepForXml(e)}addRunToFront(e){return this.root.splice(1,0,e),this}}class Xn extends s{constructor(e){super("m:oMath");for(const t of e.children)this.root.push(t)}}class $n extends s{constructor(e){super("m:t"),this.root.push(e)}}class qn extends s{constructor(e){super("m:r"),this.root.push(new $n(e))}}class Zn extends s{constructor(e){super("m:den");for(const t of e)this.root.push(t)}}class Yn extends s{constructor(e){super("m:num");for(const t of e)this.root.push(t)}}class Jn extends s{constructor(e){super("m:f"),this.root.push(new Yn(e.numerator)),this.root.push(new Zn(e.denominator))}}class Qn extends o{constructor(){super(...arguments),this.xmlKeys={accent:"m:val"}}}class es extends s{constructor(e){super("m:chr"),this.root.push(new Qn({accent:e}))}}class ts extends s{constructor(e){super("m:e");for(const t of e)this.root.push(t)}}class rs extends o{constructor(){super(...arguments),this.xmlKeys={value:"m:val"}}}class ns extends s{constructor(){super("m:limLoc"),this.root.push(new rs({value:"undOvr"}))}}class ss extends o{constructor(){super(...arguments),this.xmlKeys={hide:"m:val"}}}class is extends s{constructor(){super("m:subHide"),this.root.push(new ss({hide:1}))}}class os extends o{constructor(){super(...arguments),this.xmlKeys={hide:"m:val"}}}class as extends s{constructor(){super("m:supHide"),this.root.push(new os({hide:1}))}}class cs extends s{constructor(e,t,r){super("m:naryPr"),e&&this.root.push(new es(e)),this.root.push(new ns),t||this.root.push(new as),r||this.root.push(new is)}}class us extends s{constructor(e){super("m:sub");for(const t of e)this.root.push(t)}}class ls extends s{constructor(e){super("m:sup");for(const t of e)this.root.push(t)}}class hs extends s{constructor(e){super("m:nary"),this.root.push(new cs("∑",!!e.superScript,!!e.subScript)),e.subScript&&this.root.push(new us(e.subScript)),e.superScript&&this.root.push(new ls(e.superScript)),this.root.push(new ts(e.children))}}class ps extends s{constructor(e){super("m:nary"),this.root.push(new cs("",!!e.superScript,!!e.subScript)),e.subScript&&this.root.push(new us(e.subScript)),e.superScript&&this.root.push(new ls(e.superScript)),this.root.push(new ts(e.children))}}class ds extends s{constructor(){super("m:sSupPr")}}class fs extends s{constructor(e){super("m:sSup"),this.root.push(new ds),this.root.push(new ts(e.children)),this.root.push(new ls(e.superScript))}}class ms extends s{constructor(){super("m:sSubPr")}}class ws extends s{constructor(e){super("m:sSub"),this.root.push(new ms),this.root.push(new ts(e.children)),this.root.push(new us(e.subScript))}}class gs extends s{constructor(){super("m:sSubSupPr")}}class ys extends s{constructor(e){super("m:sSubSup"),this.root.push(new gs),this.root.push(new ts(e.children)),this.root.push(new us(e.subScript)),this.root.push(new ls(e.superScript))}}class bs extends s{constructor(){super("m:sPrePr")}}class vs extends s{constructor(e){super("m:sPre"),this.root.push(new bs),this.root.push(new ts(e.children)),this.root.push(new us(e.subScript)),this.root.push(new ls(e.superScript))}}const xs="";class _s extends s{constructor(e){if(super("m:deg"),e)for(const t of e)this.root.push(t)}}class Es extends o{constructor(){super(...arguments),this.xmlKeys={hide:"m:val"}}}class Ts extends s{constructor(){super("m:degHide"),this.root.push(new Es({hide:1}))}}class As extends s{constructor(e){super("m:radPr"),e||this.root.push(new Ts)}}class Ss extends s{constructor(e){super("m:rad"),this.root.push(new As(!!e.degree)),this.root.push(new _s(e.degree)),this.root.push(new ts(e.children))}}class Is extends s{constructor(e){super("m:fName");for(const t of e)this.root.push(t)}}class Ns extends s{constructor(){super("m:funcPr")}}class Rs extends s{constructor(e){super("m:func"),this.root.push(new Ns),this.root.push(new Is(e.name)),this.root.push(new ts(e.children))}}class ks extends o{constructor(){super(...arguments),this.xmlKeys={character:"m:val"}}}class Cs extends s{constructor(e){super("m:begChr"),this.root.push(new ks({character:e}))}}class Os extends o{constructor(){super(...arguments),this.xmlKeys={character:"m:val"}}}class Ls extends s{constructor(e){super("m:endChr"),this.root.push(new Os({character:e}))}}class Ds extends s{constructor(e){super("m:dPr"),e&&(this.root.push(new Cs(e.beginningCharacter)),this.root.push(new Ls(e.endingCharacter)))}}class Ps extends s{constructor(e){super("m:d"),this.root.push(new Ds),this.root.push(new ts(e.children))}}class Fs extends s{constructor(e){super("m:d"),this.root.push(new Ds({beginningCharacter:"[",endingCharacter:"]"})),this.root.push(new ts(e.children))}}class Bs extends s{constructor(e){super("m:d"),this.root.push(new Ds({beginningCharacter:"{",endingCharacter:"}"})),this.root.push(new ts(e.children))}}class Ms extends s{constructor(e){super("m:d"),this.root.push(new Ds({beginningCharacter:"〈",endingCharacter:"〉"})),this.root.push(new ts(e.children))}}class Us extends s{constructor(e){super("w:tblGrid");for(const t of e)this.root.push(new Hs(t))}}class Hs extends s{constructor(e){super("w:gridCol"),void 0!==e&&this.root.push(new a({width:{key:"w:w",value:(0,N.Jd)(e)}}))}}var js,zs,Ws,Gs;!function(e){e.AUTO="auto",e.DXA="dxa",e.NIL="nil",e.PERCENTAGE="pct"}(js||(js={}));class Ks extends s{constructor(e,{type:t=js.AUTO,size:r}){super(e);let n=r;t===js.PERCENTAGE&&"number"==typeof r&&(n=`${r}%`),this.root.push(new a({type:{key:"w:type",value:t},size:{key:"w:w",value:(0,N.aB)(n)}}))}}!function(e){e.TABLE="w:tblCellMar",e.TABLE_CELL="w:tcMar"}(zs||(zs={}));class Vs extends i{constructor(e,{marginUnitType:t=js.DXA,top:r,left:n,bottom:s,right:i}){super(e),void 0!==r&&this.root.push(new Ks("w:top",{type:t,size:r})),void 0!==n&&this.root.push(new Ks("w:left",{type:t,size:n})),void 0!==s&&this.root.push(new Ks("w:bottom",{type:t,size:s})),void 0!==i&&this.root.push(new Ks("w:right",{type:t,size:i}))}}class Xs extends i{constructor(e){super("w:tcBorders"),e.top&&this.root.push(new U("w:top",e.top)),e.start&&this.root.push(new U("w:start",e.start)),e.left&&this.root.push(new U("w:left",e.left)),e.bottom&&this.root.push(new U("w:bottom",e.bottom)),e.end&&this.root.push(new U("w:end",e.end)),e.right&&this.root.push(new U("w:right",e.right))}}class $s extends o{constructor(){super(...arguments),this.xmlKeys={val:"w:val"}}}class qs extends s{constructor(e){super("w:gridSpan"),this.root.push(new $s({val:(0,N.vH)(e)}))}}!function(e){e.CONTINUE="continue",e.RESTART="restart"}(Ws||(Ws={}));class Zs extends o{constructor(){super(...arguments),this.xmlKeys={val:"w:val"}}}class Ys extends s{constructor(e){super("w:vMerge"),this.root.push(new Zs({val:e}))}}!function(e){e.BOTTOM_TO_TOP_LEFT_TO_RIGHT="btLr",e.LEFT_TO_RIGHT_TOP_TO_BOTTOM="lrTb",e.TOP_TO_BOTTOM_RIGHT_TO_LEFT="tbRl"}(Gs||(Gs={}));class Js extends o{constructor(){super(...arguments),this.xmlKeys={val:"w:val"}}}class Qs extends s{constructor(e){super("w:textDirection"),this.root.push(new Js({val:e}))}}class ei extends i{constructor(e){super("w:tcPr"),e.width&&this.root.push(new Ks("w:tcW",e.width)),e.columnSpan&&this.root.push(new qs(e.columnSpan)),e.verticalMerge?this.root.push(new Ys(e.verticalMerge)):e.rowSpan&&e.rowSpan>1&&this.root.push(new Ys(Ws.RESTART)),e.borders&&this.root.push(new Xs(e.borders)),e.shading&&this.root.push(new ee(e.shading)),e.margins&&this.root.push(new Vs(zs.TABLE_CELL,e.margins)),e.textDirection&&this.root.push(new Qs(e.textDirection)),e.verticalAlign&&this.root.push(new un(e.verticalAlign))}}class ti extends s{constructor(e){super("w:tc"),this.options=e,this.root.push(new ei(e));for(const t of e.children)this.root.push(t)}prepForXml(e){return this.root[this.root.length-1]instanceof Vn||this.root.push(new Vn({})),super.prepForXml(e)}}const ri={style:g.NONE,size:0,color:"auto"},ni={style:g.SINGLE,size:4,color:"auto"};class si extends s{constructor(e){super("w:tblBorders"),e.top?this.root.push(new U("w:top",e.top)):this.root.push(new U("w:top",ni)),e.left?this.root.push(new U("w:left",e.left)):this.root.push(new U("w:left",ni)),e.bottom?this.root.push(new U("w:bottom",e.bottom)):this.root.push(new U("w:bottom",ni)),e.right?this.root.push(new U("w:right",e.right)):this.root.push(new U("w:right",ni)),e.insideHorizontal?this.root.push(new U("w:insideH",e.insideHorizontal)):this.root.push(new U("w:insideH",ni)),e.insideVertical?this.root.push(new U("w:insideV",e.insideVertical)):this.root.push(new U("w:insideV",ni))}}var ii,oi,ai,ci,ui,li,hi,pi,di;si.NONE={top:ri,bottom:ri,left:ri,right:ri,insideHorizontal:ri,insideVertical:ri},function(e){e.MARGIN="margin",e.PAGE="page",e.TEXT="text"}(ii||(ii={})),function(e){e.CENTER="center",e.INSIDE="inside",e.LEFT="left",e.OUTSIDE="outside",e.RIGHT="right"}(oi||(oi={})),function(e){e.CENTER="center",e.INSIDE="inside",e.BOTTOM="bottom",e.OUTSIDE="outside",e.INLINE="inline",e.TOP="top"}(ai||(ai={})),function(e){e.NEVER="never",e.OVERLAP="overlap"}(ci||(ci={}));class fi extends s{constructor({horizontalAnchor:e,verticalAnchor:t,absoluteHorizontalPosition:r,relativeHorizontalPosition:n,absoluteVerticalPosition:s,relativeVerticalPosition:i,bottomFromText:o,topFromText:c,leftFromText:u,rightFromText:l,overlap:h}){super("w:tblpPr"),this.root.push(new a({leftFromText:{key:"w:leftFromText",value:void 0===u?void 0:(0,N.Jd)(u)},rightFromText:{key:"w:rightFromText",value:void 0===l?void 0:(0,N.Jd)(l)},topFromText:{key:"w:topFromText",value:void 0===c?void 0:(0,N.Jd)(c)},bottomFromText:{key:"w:bottomFromText",value:void 0===o?void 0:(0,N.Jd)(o)},absoluteHorizontalPosition:{key:"w:tblpX",value:void 0===r?void 0:(0,N.xb)(r)},absoluteVerticalPosition:{key:"w:tblpY",value:void 0===s?void 0:(0,N.xb)(s)},horizontalAnchor:{key:"w:horzAnchor",value:void 0===e?void 0:e},relativeHorizontalPosition:{key:"w:tblpXSpec",value:n},relativeVerticalPosition:{key:"w:tblpYSpec",value:i},verticalAnchor:{key:"w:vertAnchor",value:t}})),h&&this.root.push(new D("w:tblOverlap",h))}}!function(e){e.AUTOFIT="autofit",e.FIXED="fixed"}(ui||(ui={}));class mi extends o{constructor(){super(...arguments),this.xmlKeys={type:"w:type"}}}class wi extends s{constructor(e){super("w:tblLayout"),this.root.push(new mi({type:e}))}}class gi extends i{constructor(e){super("w:tblPr"),e.style&&this.root.push(new O("w:tblStyle",e.style)),e.float&&this.root.push(new fi(e.float)),void 0!==e.visuallyRightToLeft&&this.root.push(new R("w:bidiVisual",e.visuallyRightToLeft)),e.width&&this.root.push(new Ks("w:tblW",e.width)),e.alignment&&this.root.push(new M(e.alignment)),e.indent&&this.root.push(new Ks("w:tblInd",e.indent)),e.borders&&this.root.push(new si(e.borders)),e.shading&&this.root.push(new ee(e.shading)),e.layout&&this.root.push(new wi(e.layout)),e.cellMargin&&this.root.push(new Vs(zs.TABLE,e.cellMargin))}}class yi extends Vr{constructor({rows:e,width:t,columnWidths:r=Array(Math.max(...e.map((e=>e.CellCount)))).fill(100),margins:n,indent:s,float:i,layout:o,style:a,borders:c,alignment:u,visuallyRightToLeft:l}){super("w:tbl"),this.root.push(new gi({borders:null!=c?c:{},width:null!=t?t:{size:100},indent:s,float:i,layout:o,style:a,alignment:u,cellMargin:n,visuallyRightToLeft:l})),this.root.push(new Us(r));for(const t of e)this.root.push(t);e.forEach(((t,r)=>{if(r===e.length-1)return;let n=0;t.cells.forEach((t=>{if(t.options.rowSpan&&t.options.rowSpan>1){const s=new ti({rowSpan:t.options.rowSpan-1,columnSpan:t.options.columnSpan,borders:t.options.borders,children:[],verticalMerge:Ws.CONTINUE});e[r+1].addCellToColumnIndex(s,n)}n+=t.options.columnSpan||1}))}))}}!function(e){e.AUTO="auto",e.ATLEAST="atLeast",e.EXACT="exact"}(li||(li={}));class bi extends o{constructor(){super(...arguments),this.xmlKeys={value:"w:val",rule:"w:hRule"}}}class vi extends s{constructor(e,t){super("w:trHeight"),this.root.push(new bi({value:(0,N.Jd)(e),rule:t}))}}class xi extends i{constructor(e){super("w:trPr"),void 0!==e.cantSplit&&this.root.push(new R("w:cantSplit",e.cantSplit)),void 0!==e.tableHeader&&this.root.push(new R("w:tblHeader",e.tableHeader)),e.height&&this.root.push(new vi(e.height.value,e.height.rule))}}class _i extends s{constructor(e){super("w:tr"),this.options=e,this.root.push(new xi(e));for(const t of e.children)this.root.push(t)}get CellCount(){return this.options.children.length}get cells(){return this.root.filter((e=>e instanceof ti))}addCellToIndex(e,t){this.root.splice(t+1,0,e)}addCellToColumnIndex(e,t){const r=this.columnIndexToRootIndex(t,!0);this.addCellToIndex(e,r-1)}rootIndexToColumnIndex(e){if(e<1||e>=this.root.length)throw new Error("cell 'rootIndex' should between 1 to "+(this.root.length-1));let t=0;for(let r=1;r<e;r++)t+=this.root[r].options.columnSpan||1;return t}columnIndexToRootIndex(e,t=!1){if(e<0)throw new Error("cell 'columnIndex' should not less than zero");let r=0,n=1;for(;r<=e;){if(n>=this.root.length){if(t)return this.root.length;throw new Error("cell 'columnIndex' should not great than "+(r-1))}const e=this.root[n];n+=1,r+=e&&e.options.columnSpan||1}return n-1}}class Ei extends o{constructor(){super(...arguments),this.xmlKeys={xmlns:"xmlns",vt:"xmlns:vt"}}}class Ti extends s{constructor(){super("Properties"),this.root.push(new Ei({xmlns:"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",vt:"http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"}))}}class Ai extends o{constructor(){super(...arguments),this.xmlKeys={xmlns:"xmlns"}}}class Si extends o{constructor(){super(...arguments),this.xmlKeys={contentType:"ContentType",extension:"Extension"}}}class Ii extends s{constructor(e,t){super("Default"),this.root.push(new Si({contentType:e,extension:t}))}}class Ni extends o{constructor(){super(...arguments),this.xmlKeys={contentType:"ContentType",partName:"PartName"}}}class Ri extends s{constructor(e,t){super("Override"),this.root.push(new Ni({contentType:e,partName:t}))}}class ki extends s{constructor(){super("Types"),this.root.push(new Ai({xmlns:"http://schemas.openxmlformats.org/package/2006/content-types"})),this.root.push(new Ii("image/png","png")),this.root.push(new Ii("image/jpeg","jpeg")),this.root.push(new Ii("image/jpeg","jpg")),this.root.push(new Ii("image/bmp","bmp")),this.root.push(new Ii("image/gif","gif")),this.root.push(new Ii("application/vnd.openxmlformats-package.relationships+xml","rels")),this.root.push(new Ii("application/xml","xml")),this.root.push(new Ri("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml","/word/document.xml")),this.root.push(new Ri("application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml","/word/styles.xml")),this.root.push(new Ri("application/vnd.openxmlformats-package.core-properties+xml","/docProps/core.xml")),this.root.push(new Ri("application/vnd.openxmlformats-officedocument.custom-properties+xml","/docProps/custom.xml")),this.root.push(new Ri("application/vnd.openxmlformats-officedocument.extended-properties+xml","/docProps/app.xml")),this.root.push(new Ri("application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml","/word/numbering.xml")),this.root.push(new Ri("application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml","/word/footnotes.xml")),this.root.push(new Ri("application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml","/word/settings.xml")),this.root.push(new Ri("application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml","/word/comments.xml"))}addFooter(e){this.root.push(new Ri("application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml",`/word/footer${e}.xml`))}addHeader(e){this.root.push(new Ri("application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml",`/word/header${e}.xml`))}}class Ci extends s{constructor(e){super("cp:coreProperties"),this.root.push(new Cn({cp:"http://schemas.openxmlformats.org/package/2006/metadata/core-properties",dc:"http://purl.org/dc/elements/1.1/",dcterms:"http://purl.org/dc/terms/",dcmitype:"http://purl.org/dc/dcmitype/",xsi:"http://www.w3.org/2001/XMLSchema-instance"})),e.title&&this.root.push(new P("dc:title",e.title)),e.subject&&this.root.push(new P("dc:subject",e.subject)),e.creator&&this.root.push(new P("dc:creator",e.creator)),e.keywords&&this.root.push(new P("cp:keywords",e.keywords)),e.description&&this.root.push(new P("dc:description",e.description)),e.lastModifiedBy&&this.root.push(new P("cp:lastModifiedBy",e.lastModifiedBy)),e.revision&&this.root.push(new P("cp:revision",String(e.revision))),this.root.push(new Oi("dcterms:created")),this.root.push(new Oi("dcterms:modified"))}}class Oi extends s{constructor(e){super(e),this.root.push(new Cn({type:"dcterms:W3CDTF"})),this.root.push((0,N.sF)(new Date))}}class Li extends o{constructor(){super(...arguments),this.xmlKeys={xmlns:"xmlns",vt:"xmlns:vt"}}}class Di extends o{constructor(){super(...arguments),this.xmlKeys={fmtid:"fmtid",pid:"pid",name:"name"}}}class Pi extends s{constructor(e,t){super("property"),this.root.push(new Di({fmtid:"{D5CDD505-2E9C-101B-9397-08002B2CF9AE}",pid:e.toString(),name:t.name})),this.root.push(new Fi(t.value))}}class Fi extends s{constructor(e){super("vt:lpwstr"),this.root.push(e)}}class Bi extends s{constructor(e){super("Properties"),this.properties=[],this.root.push(new Li({xmlns:"http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",vt:"http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"})),this.nextId=2;for(const t of e)this.addCustomProperty(t)}prepForXml(e){return this.properties.forEach((e=>this.root.push(e))),super.prepForXml(e)}addCustomProperty(e){this.properties.push(new Pi(this.nextId++,e))}}class Mi extends o{constructor(){super(...arguments),this.xmlKeys={wpc:"xmlns:wpc",mc:"xmlns:mc",o:"xmlns:o",r:"xmlns:r",m:"xmlns:m",v:"xmlns:v",wp14:"xmlns:wp14",wp:"xmlns:wp",w10:"xmlns:w10",w:"xmlns:w",w14:"xmlns:w14",w15:"xmlns:w15",wpg:"xmlns:wpg",wpi:"xmlns:wpi",wne:"xmlns:wne",wps:"xmlns:wps",cp:"xmlns:cp",dc:"xmlns:dc",dcterms:"xmlns:dcterms",dcmitype:"xmlns:dcmitype",xsi:"xmlns:xsi",type:"xsi:type"}}}class Ui extends m{constructor(e,t){super("w:ftr",t),this.refId=e,t||this.root.push(new Mi({wpc:"http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",mc:"http://schemas.openxmlformats.org/markup-compatibility/2006",o:"urn:schemas-microsoft-com:office:office",r:"http://schemas.openxmlformats.org/officeDocument/2006/relationships",m:"http://schemas.openxmlformats.org/officeDocument/2006/math",v:"urn:schemas-microsoft-com:vml",wp14:"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",wp:"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",w10:"urn:schemas-microsoft-com:office:word",w:"http://schemas.openxmlformats.org/wordprocessingml/2006/main",w14:"http://schemas.microsoft.com/office/word/2010/wordml",w15:"http://schemas.microsoft.com/office/word/2012/wordml",wpg:"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",wpi:"http://schemas.microsoft.com/office/word/2010/wordprocessingInk",wne:"http://schemas.microsoft.com/office/word/2006/wordml",wps:"http://schemas.microsoft.com/office/word/2010/wordprocessingShape"}))}get ReferenceId(){return this.refId}add(e){this.root.push(e)}}class Hi{constructor(e,t,r){this.media=e,this.footer=new Ui(t,r),this.relationships=new Fn}add(e){this.footer.add(e)}addChildElement(e){this.footer.addChildElement(e)}get View(){return this.footer}get Relationships(){return this.relationships}get Media(){return this.media}}class ji extends o{constructor(){super(...arguments),this.xmlKeys={type:"w:type",id:"w:id"}}}class zi extends s{constructor(){super("w:footnoteRef")}}class Wi extends ye{constructor(){super({style:"FootnoteReference"}),this.root.push(new zi)}}!function(e){e.SEPERATOR="separator",e.CONTINUATION_SEPERATOR="continuationSeparator"}(hi||(hi={}));class Gi extends s{constructor(e){super("w:footnote"),this.root.push(new ji({type:e.type,id:e.id}));for(let t=0;t<e.children.length;t++){const r=e.children[t];0===t&&r.addRunToFront(new Wi),this.root.push(r)}}}class Ki extends s{constructor(){super("w:continuationSeparator")}}class Vi extends ye{constructor(){super({}),this.root.push(new Ki)}}class Xi extends s{constructor(){super("w:separator")}}class $i extends ye{constructor(){super({}),this.root.push(new Xi)}}class qi extends o{constructor(){super(...arguments),this.xmlKeys={wpc:"xmlns:wpc",mc:"xmlns:mc",o:"xmlns:o",r:"xmlns:r",m:"xmlns:m",v:"xmlns:v",wp14:"xmlns:wp14",wp:"xmlns:wp",w10:"xmlns:w10",w:"xmlns:w",w14:"xmlns:w14",w15:"xmlns:w15",wpg:"xmlns:wpg",wpi:"xmlns:wpi",wne:"xmlns:wne",wps:"xmlns:wps",Ignorable:"mc:Ignorable"}}}class Zi extends s{constructor(){super("w:footnotes"),this.root.push(new qi({wpc:"http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",mc:"http://schemas.openxmlformats.org/markup-compatibility/2006",o:"urn:schemas-microsoft-com:office:office",r:"http://schemas.openxmlformats.org/officeDocument/2006/relationships",m:"http://schemas.openxmlformats.org/officeDocument/2006/math",v:"urn:schemas-microsoft-com:vml",wp14:"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",wp:"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",w10:"urn:schemas-microsoft-com:office:word",w:"http://schemas.openxmlformats.org/wordprocessingml/2006/main",w14:"http://schemas.microsoft.com/office/word/2010/wordml",w15:"http://schemas.microsoft.com/office/word/2012/wordml",wpg:"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",wpi:"http://schemas.microsoft.com/office/word/2010/wordprocessingInk",wne:"http://schemas.microsoft.com/office/word/2006/wordml",wps:"http://schemas.microsoft.com/office/word/2010/wordprocessingShape",Ignorable:"w14 w15 wp14"}));const e=new Gi({id:-1,type:hi.SEPERATOR,children:[new Vn({spacing:{after:0,line:240,lineRule:wt.AUTO},children:[new $i]})]});this.root.push(e);const t=new Gi({id:0,type:hi.CONTINUATION_SEPERATOR,children:[new Vn({spacing:{after:0,line:240,lineRule:wt.AUTO},children:[new Vi]})]});this.root.push(t)}createFootNote(e,t){const r=new Gi({id:e,children:t});this.root.push(r)}}class Yi{constructor(){this.footnotess=new Zi,this.relationships=new Fn}get View(){return this.footnotess}get Relationships(){return this.relationships}}class Ji extends o{constructor(){super(...arguments),this.xmlKeys={wpc:"xmlns:wpc",mc:"xmlns:mc",o:"xmlns:o",r:"xmlns:r",m:"xmlns:m",v:"xmlns:v",wp14:"xmlns:wp14",wp:"xmlns:wp",w10:"xmlns:w10",w:"xmlns:w",w14:"xmlns:w14",w15:"xmlns:w15",wpg:"xmlns:wpg",wpi:"xmlns:wpi",wne:"xmlns:wne",wps:"xmlns:wps",cp:"xmlns:cp",dc:"xmlns:dc",dcterms:"xmlns:dcterms",dcmitype:"xmlns:dcmitype",xsi:"xmlns:xsi",type:"xsi:type",cx:"xmlns:cx",cx1:"xmlns:cx1",cx2:"xmlns:cx2",cx3:"xmlns:cx3",cx4:"xmlns:cx4",cx5:"xmlns:cx5",cx6:"xmlns:cx6",cx7:"xmlns:cx7",cx8:"xmlns:cx8",w16cid:"xmlns:w16cid",w16se:"xmlns:w16se"}}}class Qi extends m{constructor(e,t){super("w:hdr",t),this.refId=e,t||this.root.push(new Ji({wpc:"http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",mc:"http://schemas.openxmlformats.org/markup-compatibility/2006",o:"urn:schemas-microsoft-com:office:office",r:"http://schemas.openxmlformats.org/officeDocument/2006/relationships",m:"http://schemas.openxmlformats.org/officeDocument/2006/math",v:"urn:schemas-microsoft-com:vml",wp14:"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",wp:"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",w10:"urn:schemas-microsoft-com:office:word",w:"http://schemas.openxmlformats.org/wordprocessingml/2006/main",w14:"http://schemas.microsoft.com/office/word/2010/wordml",w15:"http://schemas.microsoft.com/office/word/2012/wordml",wpg:"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",wpi:"http://schemas.microsoft.com/office/word/2010/wordprocessingInk",wne:"http://schemas.microsoft.com/office/word/2006/wordml",wps:"http://schemas.microsoft.com/office/word/2010/wordprocessingShape",cx:"http://schemas.microsoft.com/office/drawing/2014/chartex",cx1:"http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",cx2:"http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",cx3:"http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",cx4:"http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",cx5:"http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",cx6:"http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",cx7:"http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",cx8:"http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",w16cid:"http://schemas.microsoft.com/office/word/2016/wordml/cid",w16se:"http://schemas.microsoft.com/office/word/2015/wordml/symex"}))}get ReferenceId(){return this.refId}add(e){this.root.push(e)}}class eo{constructor(e,t,r){this.media=e,this.header=new Qi(t,r),this.relationships=new Fn}add(e){return this.header.add(e),this}addChildElement(e){this.header.addChildElement(e)}get View(){return this.header}get Relationships(){return this.relationships}get Media(){return this.media}}class to{constructor(){this.map=new Map}addImage(e,t){this.map.set(e,t)}get Array(){return Array.from(this.map.values())}}!function(e){e.DECIMAL="decimal",e.UPPER_ROMAN="upperRoman",e.LOWER_ROMAN="lowerRoman",e.UPPER_LETTER="upperLetter",e.LOWER_LETTER="lowerLetter",e.ORDINAL="ordinal",e.CARDINAL_TEXT="cardinalText",e.ORDINAL_TEXT="ordinalText",e.HEX="hex",e.CHICAGO="chicago",e.IDEOGRAPH__DIGITAL="ideographDigital",e.JAPANESE_COUNTING="japaneseCounting",e.AIUEO="aiueo",e.IROHA="iroha",e.DECIMAL_FULL_WIDTH="decimalFullWidth",e.DECIMAL_HALF_WIDTH="decimalHalfWidth",e.JAPANESE_LEGAL="japaneseLegal",e.JAPANESE_DIGITAL_TEN_THOUSAND="japaneseDigitalTenThousand",e.DECIMAL_ENCLOSED_CIRCLE="decimalEnclosedCircle",e.DECIMAL_FULL_WIDTH2="decimalFullWidth2",e.AIUEO_FULL_WIDTH="aiueoFullWidth",e.IROHA_FULL_WIDTH="irohaFullWidth",e.DECIMAL_ZERO="decimalZero",e.BULLET="bullet",e.GANADA="ganada",e.CHOSUNG="chosung",e.DECIMAL_ENCLOSED_FULLSTOP="decimalEnclosedFullstop",e.DECIMAL_ENCLOSED_PARENTHESES="decimalEnclosedParen",e.DECIMAL_ENCLOSED_CIRCLE_CHINESE="decimalEnclosedCircleChinese",e.IDEOGRAPH_ENCLOSED_CIRCLE="ideographEnclosedCircle",e.IDEOGRAPH_TRADITIONAL="ideographTraditional",e.IDEOGRAPH_ZODIAC="ideographZodiac",e.IDEOGRAPH_ZODIAC_TRADITIONAL="ideographZodiacTraditional",e.TAIWANESE_COUNTING="taiwaneseCounting",e.IDEOGRAPH_LEGAL_TRADITIONAL="ideographLegalTraditional",e.TAIWANESE_COUNTING_THOUSAND="taiwaneseCountingThousand",e.TAIWANESE_DIGITAL="taiwaneseDigital",e.CHINESE_COUNTING="chineseCounting",e.CHINESE_LEGAL_SIMPLIFIED="chineseLegalSimplified",e.CHINESE_COUNTING_THOUSAND="chineseCountingThousand",e.KOREAN_DIGITAL="koreanDigital",e.KOREAN_COUNTING="koreanCounting",e.KOREAN_LEGAL="koreanLegal",e.KOREAN_DIGITAL2="koreanDigital2",e.VIETNAMESE_COUNTING="vietnameseCounting",e.RUSSIAN_LOWER="russianLower",e.RUSSIAN_UPPER="russianUpper",e.NONE="none",e.NUMBER_IN_DASH="numberInDash",e.HEBREW1="hebrew1",e.HEBREW2="hebrew2",e.ARABIC_ALPHA="arabicAlpha",e.ARABIC_ABJAD="arabicAbjad",e.HINDI_VOWELS="hindiVowels",e.HINDI_CONSONANTS="hindiConsonants",e.HINDI_NUMBERS="hindiNumbers",e.HINDI_COUNTING="hindiCounting",e.THAI_LETTERS="thaiLetters",e.THAI_NUMBERS="thaiNumbers",e.THAI_COUNTING="thaiCounting",e.BAHT_TEXT="bahtText",e.DOLLAR_TEXT="dollarText",e.CUSTOM="custom"}(pi||(pi={}));class ro extends o{constructor(){super(...arguments),this.xmlKeys={ilvl:"w:ilvl",tentative:"w15:tentative"}}}class no extends s{constructor(e){super("w:numFmt"),this.root.push(new c({val:e}))}}class so extends s{constructor(e){super("w:lvlText"),this.root.push(new c({val:e}))}}class io extends s{constructor(e){super("w:lvlJc"),this.root.push(new c({val:e}))}}!function(e){e.NOTHING="nothing",e.SPACE="space",e.TAB="tab"}(di||(di={}));class oo extends s{constructor(e){super("w:suff"),this.root.push(new c({val:e}))}}class ao extends s{constructor(){super("w:isLgl")}}class co extends s{constructor({level:e,format:t,text:r,alignment:n=w.START,start:s=1,style:i,suffix:o,isLegalNumberingStyle:a}){if(super("w:lvl"),this.root.push(new L("w:start",(0,N.vH)(s))),t&&this.root.push(new no(t)),o&&this.root.push(new oo(o)),a&&this.root.push(new ao),r&&this.root.push(new so(r)),this.root.push(new io(n)),this.paragraphProperties=new Kn(i&&i.paragraph),this.runProperties=new me(i&&i.run),this.root.push(this.paragraphProperties),this.root.push(this.runProperties),e>9)throw new Error("Level cannot be greater than 9. Read more here: https://answers.microsoft.com/en-us/msoffice/forum/all/does-word-support-more-than-9-list-levels/d130fdcd-1781-446d-8c84-c6c79124e4d7");this.root.push(new ro({ilvl:(0,N.vH)(e),tentative:1}))}}class uo extends co{}class lo extends co{}class ho extends s{constructor(e){super("w:multiLevelType"),this.root.push(new c({val:e}))}}class po extends o{constructor(){super(...arguments),this.xmlKeys={abstractNumId:"w:abstractNumId",restartNumberingAfterBreak:"w15:restartNumberingAfterBreak"}}}class fo extends s{constructor(e,t){super("w:abstractNum"),this.root.push(new po({abstractNumId:(0,N.vH)(e),restartNumberingAfterBreak:0})),this.root.push(new ho("hybridMultilevel")),this.id=e;for(const e of t)this.root.push(new uo(e))}}class mo extends s{constructor(e){super("w:abstractNumId"),this.root.push(new c({val:e}))}}class wo extends o{constructor(){super(...arguments),this.xmlKeys={numId:"w:numId"}}}class go extends s{constructor(e){if(super("w:num"),this.numId=e.numId,this.reference=e.reference,this.instance=e.instance,this.root.push(new wo({numId:(0,N.vH)(e.numId)})),this.root.push(new mo((0,N.vH)(e.abstractNumId))),e.overrideLevels&&e.overrideLevels.length)for(const t of e.overrideLevels)this.root.push(new bo(t.num,t.start))}}class yo extends o{constructor(){super(...arguments),this.xmlKeys={ilvl:"w:ilvl"}}}class bo extends s{constructor(e,t){super("w:lvlOverride"),this.root.push(new yo({ilvl:e})),void 0!==t&&this.root.push(new xo(t))}}class vo extends o{constructor(){super(...arguments),this.xmlKeys={val:"w:val"}}}class xo extends s{constructor(e){super("w:startOverride"),this.root.push(new vo({val:e}))}}class _o extends s{constructor(e){super("w:numbering"),this.abstractNumberingMap=new Map,this.concreteNumberingMap=new Map,this.referenceConfigMap=new Map,this.root.push(new Cn({wpc:"http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",mc:"http://schemas.openxmlformats.org/markup-compatibility/2006",o:"urn:schemas-microsoft-com:office:office",r:"http://schemas.openxmlformats.org/officeDocument/2006/relationships",m:"http://schemas.openxmlformats.org/officeDocument/2006/math",v:"urn:schemas-microsoft-com:vml",wp14:"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",wp:"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",w10:"urn:schemas-microsoft-com:office:word",w:"http://schemas.openxmlformats.org/wordprocessingml/2006/main",w14:"http://schemas.microsoft.com/office/word/2010/wordml",w15:"http://schemas.microsoft.com/office/word/2012/wordml",wpg:"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",wpi:"http://schemas.microsoft.com/office/word/2010/wordprocessingInk",wne:"http://schemas.microsoft.com/office/word/2006/wordml",wps:"http://schemas.microsoft.com/office/word/2010/wordprocessingShape",Ignorable:"w14 w15 wp14"}));const t=new fo((0,Ae.F2)(),[{level:0,format:pi.BULLET,text:"●",alignment:w.LEFT,style:{paragraph:{indent:{left:(0,Ae.vw)(.5),hanging:(0,Ae.vw)(.25)}}}},{level:1,format:pi.BULLET,text:"○",alignment:w.LEFT,style:{paragraph:{indent:{left:(0,Ae.vw)(1),hanging:(0,Ae.vw)(.25)}}}},{level:2,format:pi.BULLET,text:"■",alignment:w.LEFT,style:{paragraph:{indent:{left:2160,hanging:(0,Ae.vw)(.25)}}}},{level:3,format:pi.BULLET,text:"●",alignment:w.LEFT,style:{paragraph:{indent:{left:2880,hanging:(0,Ae.vw)(.25)}}}},{level:4,format:pi.BULLET,text:"○",alignment:w.LEFT,style:{paragraph:{indent:{left:3600,hanging:(0,Ae.vw)(.25)}}}},{level:5,format:pi.BULLET,text:"■",alignment:w.LEFT,style:{paragraph:{indent:{left:4320,hanging:(0,Ae.vw)(.25)}}}},{level:6,format:pi.BULLET,text:"●",alignment:w.LEFT,style:{paragraph:{indent:{left:5040,hanging:(0,Ae.vw)(.25)}}}},{level:7,format:pi.BULLET,text:"●",alignment:w.LEFT,style:{paragraph:{indent:{left:5760,hanging:(0,Ae.vw)(.25)}}}},{level:8,format:pi.BULLET,text:"●",alignment:w.LEFT,style:{paragraph:{indent:{left:6480,hanging:(0,Ae.vw)(.25)}}}}]);this.concreteNumberingMap.set("default-bullet-numbering",new go({numId:1,abstractNumId:t.id,reference:"default-bullet-numbering",instance:0,overrideLevels:[{num:0,start:1}]})),this.abstractNumberingMap.set("default-bullet-numbering",t);for(const t of e.config)this.abstractNumberingMap.set(t.reference,new fo((0,Ae.F2)(),t.levels)),this.referenceConfigMap.set(t.reference,t.levels)}prepForXml(e){for(const e of this.abstractNumberingMap.values())this.root.push(e);for(const e of this.concreteNumberingMap.values())this.root.push(e);return super.prepForXml(e)}createConcreteNumberingInstance(e,t){const r=this.abstractNumberingMap.get(e);if(!r)return;const n=`${e}-${t}`;if(this.concreteNumberingMap.has(n))return;const s=this.referenceConfigMap.get(e),i=s&&s[0].start,o={numId:(0,Ae.$U)(),abstractNumId:r.id,reference:e,instance:t,overrideLevel:i&&Number.isInteger(i)?{num:0,start:i}:{num:0,start:1}};this.concreteNumberingMap.set(n,new go(o))}get ConcreteNumbering(){return Array.from(this.concreteNumberingMap.values())}get ReferenceConfig(){return Array.from(this.referenceConfigMap.values())}}class Eo extends o{constructor(){super(...arguments),this.xmlKeys={version:"w:val",name:"w:name",uri:"w:uri"}}}class To extends s{constructor(e){super("w:compatSetting"),this.root.push(new Eo({version:e,uri:"http://schemas.microsoft.com/office/word",name:"compatibilityMode"}))}}class Ao extends s{constructor(e){super("w:compat"),e.version&&this.root.push(new To(e.version)),e.useSingleBorderforContiguousCells&&this.root.push(new R("w:useSingleBorderforContiguousCells",e.useSingleBorderforContiguousCells)),e.wordPerfectJustification&&this.root.push(new R("w:wpJustification",e.wordPerfectJustification)),e.noTabStopForHangingIndent&&this.root.push(new R("w:noTabHangInd",e.noTabStopForHangingIndent)),e.noLeading&&this.root.push(new R("w:noLeading",e.noLeading)),e.spaceForUnderline&&this.root.push(new R("w:spaceForUL",e.spaceForUnderline)),e.noColumnBalance&&this.root.push(new R("w:noColumnBalance",e.noColumnBalance)),e.balanceSingleByteDoubleByteWidth&&this.root.push(new R("w:balanceSingleByteDoubleByteWidth",e.balanceSingleByteDoubleByteWidth)),e.noExtraLineSpacing&&this.root.push(new R("w:noExtraLineSpacing",e.noExtraLineSpacing)),e.doNotLeaveBackslashAlone&&this.root.push(new R("w:doNotLeaveBackslashAlone",e.doNotLeaveBackslashAlone)),e.underlineTrailingSpaces&&this.root.push(new R("w:ulTrailSpace",e.underlineTrailingSpaces)),e.doNotExpandShiftReturn&&this.root.push(new R("w:doNotExpandShiftReturn",e.doNotExpandShiftReturn)),e.spacingInWholePoints&&this.root.push(new R("w:spacingInWholePoints",e.spacingInWholePoints)),e.lineWrapLikeWord6&&this.root.push(new R("w:lineWrapLikeWord6",e.lineWrapLikeWord6)),e.printBodyTextBeforeHeader&&this.root.push(new R("w:printBodyTextBeforeHeader",e.printBodyTextBeforeHeader)),e.printColorsBlack&&this.root.push(new R("w:printColBlack",e.printColorsBlack)),e.spaceWidth&&this.root.push(new R("w:wpSpaceWidth",e.spaceWidth)),e.showBreaksInFrames&&this.root.push(new R("w:showBreaksInFrames",e.showBreaksInFrames)),e.subFontBySize&&this.root.push(new R("w:subFontBySize",e.subFontBySize)),e.suppressBottomSpacing&&this.root.push(new R("w:suppressBottomSpacing",e.suppressBottomSpacing)),e.suppressTopSpacing&&this.root.push(new R("w:suppressTopSpacing",e.suppressTopSpacing)),e.suppressSpacingAtTopOfPage&&this.root.push(new R("w:suppressSpacingAtTopOfPage",e.suppressSpacingAtTopOfPage)),e.suppressTopSpacingWP&&this.root.push(new R("w:suppressTopSpacingWP",e.suppressTopSpacingWP)),e.suppressSpBfAfterPgBrk&&this.root.push(new R("w:suppressSpBfAfterPgBrk",e.suppressSpBfAfterPgBrk)),e.swapBordersFacingPages&&this.root.push(new R("w:swapBordersFacingPages",e.swapBordersFacingPages)),e.convertMailMergeEsc&&this.root.push(new R("w:convMailMergeEsc",e.convertMailMergeEsc)),e.truncateFontHeightsLikeWP6&&this.root.push(new R("w:truncateFontHeightsLikeWP6",e.truncateFontHeightsLikeWP6)),e.macWordSmallCaps&&this.root.push(new R("w:mwSmallCaps",e.macWordSmallCaps)),e.usePrinterMetrics&&this.root.push(new R("w:usePrinterMetrics",e.usePrinterMetrics)),e.doNotSuppressParagraphBorders&&this.root.push(new R("w:doNotSuppressParagraphBorders",e.doNotSuppressParagraphBorders)),e.wrapTrailSpaces&&this.root.push(new R("w:wrapTrailSpaces",e.wrapTrailSpaces)),e.footnoteLayoutLikeWW8&&this.root.push(new R("w:footnoteLayoutLikeWW8",e.footnoteLayoutLikeWW8)),e.shapeLayoutLikeWW8&&this.root.push(new R("w:shapeLayoutLikeWW8",e.shapeLayoutLikeWW8)),e.alignTablesRowByRow&&this.root.push(new R("w:alignTablesRowByRow",e.alignTablesRowByRow)),e.forgetLastTabAlignment&&this.root.push(new R("w:forgetLastTabAlignment",e.forgetLastTabAlignment)),e.adjustLineHeightInTable&&this.root.push(new R("w:adjustLineHeightInTable",e.adjustLineHeightInTable)),e.autoSpaceLikeWord95&&this.root.push(new R("w:autoSpaceLikeWord95",e.autoSpaceLikeWord95)),e.noSpaceRaiseLower&&this.root.push(new R("w:noSpaceRaiseLower",e.noSpaceRaiseLower)),e.doNotUseHTMLParagraphAutoSpacing&&this.root.push(new R("w:doNotUseHTMLParagraphAutoSpacing",e.doNotUseHTMLParagraphAutoSpacing)),e.layoutRawTableWidth&&this.root.push(new R("w:layoutRawTableWidth",e.layoutRawTableWidth)),e.layoutTableRowsApart&&this.root.push(new R("w:layoutTableRowsApart",e.layoutTableRowsApart)),e.useWord97LineBreakRules&&this.root.push(new R("w:useWord97LineBreakRules",e.useWord97LineBreakRules)),e.doNotBreakWrappedTables&&this.root.push(new R("w:doNotBreakWrappedTables",e.doNotBreakWrappedTables)),e.doNotSnapToGridInCell&&this.root.push(new R("w:doNotSnapToGridInCell",e.doNotSnapToGridInCell)),e.selectFieldWithFirstOrLastCharacter&&this.root.push(new R("w:selectFldWithFirstOrLastChar",e.selectFieldWithFirstOrLastCharacter)),e.applyBreakingRules&&this.root.push(new R("w:applyBreakingRules",e.applyBreakingRules)),e.doNotWrapTextWithPunctuation&&this.root.push(new R("w:doNotWrapTextWithPunct",e.doNotWrapTextWithPunctuation)),e.doNotUseEastAsianBreakRules&&this.root.push(new R("w:doNotUseEastAsianBreakRules",e.doNotUseEastAsianBreakRules)),e.useWord2002TableStyleRules&&this.root.push(new R("w:useWord2002TableStyleRules",e.useWord2002TableStyleRules)),e.growAutofit&&this.root.push(new R("w:growAutofit",e.growAutofit)),e.useFELayout&&this.root.push(new R("w:useFELayout",e.useFELayout)),e.useNormalStyleForList&&this.root.push(new R("w:useNormalStyleForList",e.useNormalStyleForList)),e.doNotUseIndentAsNumberingTabStop&&this.root.push(new R("w:doNotUseIndentAsNumberingTabStop",e.doNotUseIndentAsNumberingTabStop)),e.useAlternateEastAsianLineBreakRules&&this.root.push(new R("w:useAltKinsokuLineBreakRules",e.useAlternateEastAsianLineBreakRules)),e.allowSpaceOfSameStyleInTable&&this.root.push(new R("w:allowSpaceOfSameStyleInTable",e.allowSpaceOfSameStyleInTable)),e.doNotSuppressIndentation&&this.root.push(new R("w:doNotSuppressIndentation",e.doNotSuppressIndentation)),e.doNotAutofitConstrainedTables&&this.root.push(new R("w:doNotAutofitConstrainedTables",e.doNotAutofitConstrainedTables)),e.autofitToFirstFixedWidthCell&&this.root.push(new R("w:autofitToFirstFixedWidthCell",e.autofitToFirstFixedWidthCell)),e.underlineTabInNumberingList&&this.root.push(new R("w:underlineTabInNumList",e.underlineTabInNumberingList)),e.displayHangulFixedWidth&&this.root.push(new R("w:displayHangulFixedWidth",e.displayHangulFixedWidth)),e.splitPgBreakAndParaMark&&this.root.push(new R("w:splitPgBreakAndParaMark",e.splitPgBreakAndParaMark)),e.doNotVerticallyAlignCellWithSp&&this.root.push(new R("w:doNotVertAlignCellWithSp",e.doNotVerticallyAlignCellWithSp)),e.doNotBreakConstrainedForcedTable&&this.root.push(new R("w:doNotBreakConstrainedForcedTable",e.doNotBreakConstrainedForcedTable)),e.ignoreVerticalAlignmentInTextboxes&&this.root.push(new R("w:doNotVertAlignInTxbx",e.ignoreVerticalAlignmentInTextboxes)),e.useAnsiKerningPairs&&this.root.push(new R("w:useAnsiKerningPairs",e.useAnsiKerningPairs)),e.cachedColumnBalance&&this.root.push(new R("w:cachedColBalance",e.cachedColumnBalance))}}class So extends o{constructor(){super(...arguments),this.xmlKeys={wpc:"xmlns:wpc",mc:"xmlns:mc",o:"xmlns:o",r:"xmlns:r",m:"xmlns:m",v:"xmlns:v",wp14:"xmlns:wp14",wp:"xmlns:wp",w10:"xmlns:w10",w:"xmlns:w",w14:"xmlns:w14",w15:"xmlns:w15",wpg:"xmlns:wpg",wpi:"xmlns:wpi",wne:"xmlns:wne",wps:"xmlns:wps",Ignorable:"mc:Ignorable"}}}class Io extends s{constructor(e){var t,r,n,s;super("w:settings"),this.root.push(new So({wpc:"http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",mc:"http://schemas.openxmlformats.org/markup-compatibility/2006",o:"urn:schemas-microsoft-com:office:office",r:"http://schemas.openxmlformats.org/officeDocument/2006/relationships",m:"http://schemas.openxmlformats.org/officeDocument/2006/math",v:"urn:schemas-microsoft-com:vml",wp14:"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",wp:"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",w10:"urn:schemas-microsoft-com:office:word",w:"http://schemas.openxmlformats.org/wordprocessingml/2006/main",w14:"http://schemas.microsoft.com/office/word/2010/wordml",w15:"http://schemas.microsoft.com/office/word/2012/wordml",wpg:"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",wpi:"http://schemas.microsoft.com/office/word/2010/wordprocessingInk",wne:"http://schemas.microsoft.com/office/word/2006/wordml",wps:"http://schemas.microsoft.com/office/word/2010/wordprocessingShape",Ignorable:"w14 w15 wp14"})),this.root.push(new R("w:displayBackgroundShape",!0)),void 0!==e.trackRevisions&&this.root.push(new R("w:trackRevisions",e.trackRevisions)),void 0!==e.evenAndOddHeaders&&this.root.push(new R("w:evenAndOddHeaders",e.evenAndOddHeaders)),void 0!==e.updateFields&&this.root.push(new R("w:updateFields",e.updateFields)),this.root.push(new Ao(Object.assign(Object.assign({},null!==(t=e.compatibility)&&void 0!==t?t:{}),{version:null!==(s=null!==(n=null===(r=e.compatibility)||void 0===r?void 0:r.version)&&void 0!==n?n:e.compatibilityModeVersion)&&void 0!==s?s:15})))}}class No extends o{constructor(){super(...arguments),this.xmlKeys={val:"w:val"}}}class Ro extends s{constructor(e){super("w:name"),this.root.push(new No({val:e}))}}class ko extends s{constructor(e){super("w:uiPriority"),this.root.push(new No({val:(0,N.vH)(e)}))}}class Co extends o{constructor(){super(...arguments),this.xmlKeys={type:"w:type",styleId:"w:styleId",default:"w:default",customStyle:"w:customStyle"}}}class Oo extends s{constructor(e,t){super("w:style"),this.root.push(new Co(e)),t.name&&this.root.push(new Ro(t.name)),t.basedOn&&this.root.push(new O("w:basedOn",t.basedOn)),t.next&&this.root.push(new O("w:next",t.next)),t.link&&this.root.push(new O("w:link",t.link)),void 0!==t.uiPriority&&this.root.push(new ko(t.uiPriority)),void 0!==t.semiHidden&&this.root.push(new R("w:semiHidden",t.semiHidden)),void 0!==t.unhideWhenUsed&&this.root.push(new R("w:unhideWhenUsed",t.unhideWhenUsed)),void 0!==t.quickFormat&&this.root.push(new R("w:qFormat",t.quickFormat))}}class Lo extends Oo{constructor(e){super({type:"paragraph",styleId:e.id},e),this.paragraphProperties=new Kn(e.paragraph),this.runProperties=new me(e.run),this.root.push(this.paragraphProperties),this.root.push(this.runProperties)}}class Do extends Oo{constructor(e){super({type:"character",styleId:e.id},Object.assign({uiPriority:99,unhideWhenUsed:!0},e)),this.runProperties=new me(e.run),this.root.push(this.runProperties)}}class Po extends Lo{constructor(e){super(Object.assign(Object.assign({},e),{basedOn:"Normal",next:"Normal",quickFormat:!0}))}}class Fo extends Po{constructor(e){super(Object.assign(Object.assign({},e),{id:"Title",name:"Title"}))}}class Bo extends Po{constructor(e){super(Object.assign(Object.assign({},e),{id:"Heading1",name:"Heading 1"}))}}class Mo extends Po{constructor(e){super(Object.assign(Object.assign({},e),{id:"Heading2",name:"Heading 2"}))}}class Uo extends Po{constructor(e){super(Object.assign(Object.assign({},e),{id:"Heading3",name:"Heading 3"}))}}class Ho extends Po{constructor(e){super(Object.assign(Object.assign({},e),{id:"Heading4",name:"Heading 4"}))}}class jo extends Po{constructor(e){super(Object.assign(Object.assign({},e),{id:"Heading5",name:"Heading 5"}))}}class zo extends Po{constructor(e){super(Object.assign(Object.assign({},e),{id:"Heading6",name:"Heading 6"}))}}class Wo extends Po{constructor(e){super(Object.assign(Object.assign({},e),{id:"Strong",name:"Strong"}))}}class Go extends Lo{constructor(e){super(Object.assign(Object.assign({},e),{id:"ListParagraph",name:"List Paragraph",basedOn:"Normal",quickFormat:!0}))}}class Ko extends Lo{constructor(e){super(Object.assign(Object.assign({},e),{id:"FootnoteText",name:"footnote text",link:"FootnoteTextChar",basedOn:"Normal",uiPriority:99,semiHidden:!0,unhideWhenUsed:!0,paragraph:{spacing:{after:0,line:240,lineRule:wt.AUTO}},run:{size:20}}))}}class Vo extends Do{constructor(e){super(Object.assign(Object.assign({},e),{id:"FootnoteReference",name:"footnote reference",basedOn:"DefaultParagraphFont",semiHidden:!0,run:{superScript:!0}}))}}class Xo extends Do{constructor(e){super(Object.assign(Object.assign({},e),{id:"FootnoteTextChar",name:"Footnote Text Char",basedOn:"DefaultParagraphFont",link:"FootnoteText",semiHidden:!0,run:{size:20}}))}}class $o extends Do{constructor(e){super(Object.assign(Object.assign({},e),{id:"Hyperlink",name:"Hyperlink",basedOn:"DefaultParagraphFont",run:{color:"0563C1",underline:{type:A.SINGLE}}}))}}class qo extends s{constructor(e){if(super("w:styles"),e.initialStyles&&this.root.push(e.initialStyles),e.importedStyles)for(const t of e.importedStyles)this.root.push(t);if(e.paragraphStyles)for(const t of e.paragraphStyles)this.root.push(new Lo(t));if(e.characterStyles)for(const t of e.characterStyles)this.root.push(new Do(t))}}class Zo extends s{constructor(e){super("w:pPrDefault"),this.root.push(new Kn(e))}}class Yo extends s{constructor(e){super("w:rPrDefault"),this.root.push(new me(e))}}class Jo extends s{constructor(e){super("w:docDefaults"),this.runPropertiesDefaults=new Yo(e.run),this.paragraphPropertiesDefaults=new Zo(e.paragraph),this.root.push(this.runPropertiesDefaults),this.root.push(this.paragraphPropertiesDefaults)}}class Qo{newInstance(e){const t=(0,u.xml2js)(e,{compact:!1});let r;for(const e of t.elements||[])"w:styles"===e.name&&(r=e);if(void 0===r)throw new Error("can not find styles element");const n=r.elements||[];return new qo({initialStyles:new d(r.attributes),importedStyles:n.map((e=>l(e)))})}}class ea{newInstance(e={}){var t;return{initialStyles:new Cn({mc:"http://schemas.openxmlformats.org/markup-compatibility/2006",r:"http://schemas.openxmlformats.org/officeDocument/2006/relationships",w:"http://schemas.openxmlformats.org/wordprocessingml/2006/main",w14:"http://schemas.microsoft.com/office/word/2010/wordml",w15:"http://schemas.microsoft.com/office/word/2012/wordml",Ignorable:"w14 w15"}),importedStyles:[new Jo(null!==(t=e.document)&&void 0!==t?t:{}),new Fo(Object.assign({run:{size:56}},e.title)),new Bo(Object.assign({run:{color:"2E74B5",size:32}},e.heading1)),new Mo(Object.assign({run:{color:"2E74B5",size:26}},e.heading2)),new Uo(Object.assign({run:{color:"1F4D78",size:24}},e.heading3)),new Ho(Object.assign({run:{color:"2E74B5",italics:!0}},e.heading4)),new jo(Object.assign({run:{color:"2E74B5"}},e.heading5)),new zo(Object.assign({run:{color:"1F4D78"}},e.heading6)),new Wo(Object.assign({run:{bold:!0}},e.strong)),new Go(e.listParagraph||{}),new $o(e.hyperlink||{}),new Vo(e.footnoteReference||{}),new Ko(e.footnoteText||{}),new Xo(e.footnoteTextChar||{})]}}}class ta{constructor(e){var t,r,n,s,i,o,a;if(this.currentRelationshipId=1,this.headers=[],this.footers=[],this.coreProperties=new Ci(Object.assign(Object.assign({},e),{creator:null!==(t=e.creator)&&void 0!==t?t:"Un-named",revision:null!==(r=e.revision)&&void 0!==r?r:1,lastModifiedBy:null!==(n=e.lastModifiedBy)&&void 0!==n?n:"Un-named"})),this.numbering=new _o(e.numbering?e.numbering:{config:[]}),this.comments=new fr(null!==(s=e.comments)&&void 0!==s?s:{children:[]}),this.fileRelationships=new Fn,this.customProperties=new Bi(null!==(i=e.customProperties)&&void 0!==i?i:[]),this.appProperties=new Ti,this.footnotesWrapper=new Yi,this.contentTypes=new ki,this.documentWrapper=new Bn({background:e.background}),this.settings=new Io({compatibilityModeVersion:e.compatabilityModeVersion,compatibility:e.compatibility,evenAndOddHeaders:!!e.evenAndOddHeaderAndFooters,trackRevisions:null===(o=e.features)||void 0===o?void 0:o.trackRevisions,updateFields:null===(a=e.features)||void 0===a?void 0:a.updateFields}),this.media=new to,e.externalStyles){const t=new Qo;this.styles=t.newInstance(e.externalStyles)}else if(e.styles){const t=(new ea).newInstance(e.styles.default);this.styles=new qo(Object.assign(Object.assign({},t),e.styles))}else{const e=new ea;this.styles=new qo(e.newInstance())}this.addDefaultRelationships();for(const t of e.sections)this.addSection(t);if(e.footnotes)for(const t in e.footnotes)this.footnotesWrapper.View.createFootNote(parseFloat(t),e.footnotes[t].children)}addSection({headers:e={},footers:t={},children:r,properties:n}){this.documentWrapper.View.Body.addSection(Object.assign(Object.assign({},n),{headerWrapperGroup:{default:e.default?this.createHeader(e.default):void 0,first:e.first?this.createHeader(e.first):void 0,even:e.even?this.createHeader(e.even):void 0},footerWrapperGroup:{default:t.default?this.createFooter(t.default):void 0,first:t.first?this.createFooter(t.first):void 0,even:t.even?this.createFooter(t.even):void 0}}));for(const e of r)this.documentWrapper.View.add(e)}createHeader(e){const t=new eo(this.media,this.currentRelationshipId++);for(const r of e.options.children)t.add(r);return this.addHeaderToDocument(t),t}createFooter(e){const t=new Hi(this.media,this.currentRelationshipId++);for(const r of e.options.children)t.add(r);return this.addFooterToDocument(t),t}addHeaderToDocument(e,t=Tt.DEFAULT){this.headers.push({header:e,type:t}),this.documentWrapper.Relationships.createRelationship(e.View.ReferenceId,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/header",`header${this.headers.length}.xml`),this.contentTypes.addHeader(this.headers.length)}addFooterToDocument(e,t=Tt.DEFAULT){this.footers.push({footer:e,type:t}),this.documentWrapper.Relationships.createRelationship(e.View.ReferenceId,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer",`footer${this.footers.length}.xml`),this.contentTypes.addFooter(this.footers.length)}addDefaultRelationships(){this.fileRelationships.createRelationship(1,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument","word/document.xml"),this.fileRelationships.createRelationship(2,"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties","docProps/core.xml"),this.fileRelationships.createRelationship(3,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties","docProps/app.xml"),this.fileRelationships.createRelationship(4,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties","docProps/custom.xml"),this.documentWrapper.Relationships.createRelationship(this.currentRelationshipId++,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles","styles.xml"),this.documentWrapper.Relationships.createRelationship(this.currentRelationshipId++,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering","numbering.xml"),this.documentWrapper.Relationships.createRelationship(this.currentRelationshipId++,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes","footnotes.xml"),this.documentWrapper.Relationships.createRelationship(this.currentRelationshipId++,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings","settings.xml"),this.documentWrapper.Relationships.createRelationship(this.currentRelationshipId++,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments","comments.xml")}get Document(){return this.documentWrapper}get Styles(){return this.styles}get CoreProperties(){return this.coreProperties}get Numbering(){return this.numbering}get Media(){return this.media}get FileRelationships(){return this.fileRelationships}get Headers(){return this.headers.map((e=>e.header))}get Footers(){return this.footers.map((e=>e.footer))}get ContentTypes(){return this.contentTypes}get CustomProperties(){return this.customProperties}get AppProperties(){return this.appProperties}get FootNotes(){return this.footnotesWrapper}get Settings(){return this.settings}get Comments(){return this.comments}}const ra="";class na extends s{constructor(e={}){super("w:instrText"),this.properties=e,this.root.push(new q({space:_.PRESERVE}));let t="TOC";this.properties.captionLabel&&(t=`${t} \\a "${this.properties.captionLabel}"`),this.properties.entriesFromBookmark&&(t=`${t} \\b "${this.properties.entriesFromBookmark}"`),this.properties.captionLabelIncludingNumbers&&(t=`${t} \\c "${this.properties.captionLabelIncludingNumbers}"`),this.properties.sequenceAndPageNumbersSeparator&&(t=`${t} \\d "${this.properties.sequenceAndPageNumbersSeparator}"`),this.properties.tcFieldIdentifier&&(t=`${t} \\f "${this.properties.tcFieldIdentifier}"`),this.properties.hyperlink&&(t=`${t} \\h`),this.properties.tcFieldLevelRange&&(t=`${t} \\l "${this.properties.tcFieldLevelRange}"`),this.properties.pageNumbersEntryLevelsRange&&(t=`${t} \\n "${this.properties.pageNumbersEntryLevelsRange}"`),this.properties.headingStyleRange&&(t=`${t} \\o "${this.properties.headingStyleRange}"`),this.properties.entryAndPageNumberSeparator&&(t=`${t} \\p "${this.properties.entryAndPageNumberSeparator}"`),this.properties.seqFieldIdentifierForPrefix&&(t=`${t} \\s "${this.properties.seqFieldIdentifierForPrefix}"`),this.properties.stylesWithLevels&&this.properties.stylesWithLevels.length&&(t=`${t} \\t "${this.properties.stylesWithLevels.map((e=>`${e.styleName},${e.level}`)).join(",")}"`),this.properties.useAppliedParagraphOutlineLevel&&(t=`${t} \\u`),this.properties.preserveTabInEntries&&(t=`${t} \\w`),this.properties.preserveNewLineInEntries&&(t=`${t} \\x`),this.properties.hideTabAndPageNumbersInWebView&&(t=`${t} \\z`),this.root.push(t)}}class sa extends s{constructor(){super("w:sdtContent")}}class ia extends s{constructor(e){super("w:sdtPr"),this.root.push(new O("w:alias",e))}}class oa extends Vr{constructor(e="Table of Contents",t){super("w:sdt"),this.root.push(new ia(e));const r=new sa,n=new Vn({children:[new ye({children:[new V(!0),new na(t),new X]})]});r.addChildElement(n);const s=new Vn({children:[new ye({children:[new $]})]});r.addChildElement(s),this.root.push(r)}}class aa{constructor(e,t){this.styleName=e,this.level=t}}class ca{constructor(e={children:[]}){this.options=e}}class ua{constructor(e={children:[]}){this.options=e}}class la extends o{constructor(){super(...arguments),this.xmlKeys={id:"w:id"}}}class ha extends s{constructor(e){super("w:footnoteReference"),this.root.push(new la({id:e}))}}class pa extends ye{constructor(e){super({style:"FootnoteReference"}),this.root.push(new ha(e))}}class da extends s{constructor(e){super("w:ins"),this.root.push(new te({id:e.id,author:e.author,date:e.date})),this.addChildElement(new be(e))}}class fa extends s{constructor(){super("w:delInstrText"),this.root.push(new q({space:_.PRESERVE})),this.root.push("PAGE")}}class ma extends s{constructor(){super("w:delInstrText"),this.root.push(new q({space:_.PRESERVE})),this.root.push("NUMPAGES")}}class wa extends s{constructor(){super("w:delInstrText"),this.root.push(new q({space:_.PRESERVE})),this.root.push("SECTIONPAGES")}}class ga extends s{constructor(e){super("w:delText"),this.root.push(new q({space:_.PRESERVE})),this.root.push(e)}}class ya extends s{constructor(e){super("w:del"),this.root.push(new te({id:e.id,author:e.author,date:e.date})),this.deletedTextRunWrapper=new ba(e),this.addChildElement(this.deletedTextRunWrapper)}}class ba extends s{constructor(e){if(super("w:r"),this.root.push(new me(e)),e.children)for(const t of e.children)if("string"!=typeof t)this.root.push(t);else switch(t){case I.CURRENT:this.root.push(new V),this.root.push(new fa),this.root.push(new X),this.root.push(new $);break;case I.TOTAL_PAGES:this.root.push(new V),this.root.push(new ma),this.root.push(new X),this.root.push(new $);break;case I.TOTAL_PAGES_IN_SECTION:this.root.push(new V),this.root.push(new wa),this.root.push(new X),this.root.push(new $);break;default:this.root.push(new ga(t))}else e.text&&this.root.push(new ga(e.text));if(e.break)for(let t=0;t<e.break;t++)this.root.splice(1,0,new G)}}var va=r(6085),xa=r(3479);class _a{format(e,t={stack:[]}){const r=e.prepForXml(t);if(r)return r;throw Error("XMLComponent did not format correctly")}}class Ea{replace(e,t,r){let n=e;return t.forEach(((e,t)=>{n=n.replace(new RegExp(`{${e.fileName}}`,"g"),(r+t).toString())})),n}getMediaData(e,t){return t.Array.filter((t=>e.search(`{${t.fileName}}`)>0))}}class Ta{replace(e,t){let r=e;for(const e of t)r=r.replace(new RegExp(`{${e.reference}-${e.instance}}`,"g"),e.numId.toString());return r}}var Aa,Sa=function(e,t,r,n){return new(r||(r=Promise))((function(s,i){function o(e){try{c(n.next(e))}catch(e){i(e)}}function a(e){try{c(n.throw(e))}catch(e){i(e)}}function c(e){var t;e.done?s(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(o,a)}c((n=n.apply(e,t||[])).next())}))};!function(e){e.NONE="",e.WITH_2_BLANKS="  ",e.WITH_4_BLANKS="    ",e.WITH_TAB="\t"}(Aa||(Aa={}));class Ia{static toString(e,t){return Sa(this,void 0,void 0,(function*(){const r=this.compiler.compile(e,t);return yield r.generateAsync({type:"string",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",compression:"DEFLATE"})}))}static toBuffer(e,t){return Sa(this,void 0,void 0,(function*(){const r=this.compiler.compile(e,t);return yield r.generateAsync({type:"nodebuffer",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",compression:"DEFLATE"})}))}static toBase64String(e,t){return Sa(this,void 0,void 0,(function*(){const r=this.compiler.compile(e,t);return yield r.generateAsync({type:"base64",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",compression:"DEFLATE"})}))}static toBlob(e,t){return Sa(this,void 0,void 0,(function*(){const r=this.compiler.compile(e,t);return yield r.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",compression:"DEFLATE"})}))}static toStream(e,t){return this.compiler.compile(e,t).generateNodeStream({type:"nodebuffer",streamFiles:!0,mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",compression:"DEFLATE"})}}Ia.compiler=new class{constructor(){this.formatter=new _a,this.imageReplacer=new Ea,this.numberingReplacer=new Ta}compile(e,t){const r=new va,n=this.xmlifyFile(e,t),s=new Map(Object.entries(n));for(const[,e]of s)if(Array.isArray(e))for(const t of e)r.file(t.path,t.data);else r.file(e.path,e.data);for(const{stream:t,fileName:n}of e.Media.Array)r.file(`word/media/${n}`,t);return r}xmlifyFile(e,t){const r=e.Document.Relationships.RelationshipCount+1,n=xa(this.formatter.format(e.Document.View,{viewWrapper:e.Document,file:e,stack:[]}),{indent:t,declaration:{standalone:"yes",encoding:"UTF-8"}}),s=this.imageReplacer.getMediaData(n,e.Media);return{Relationships:{data:(()=>(s.forEach(((t,n)=>{e.Document.Relationships.createRelationship(r+n,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",`media/${t.fileName}`)})),xa(this.formatter.format(e.Document.Relationships,{viewWrapper:e.Document,file:e,stack:[]}),{indent:t,declaration:{encoding:"UTF-8"}})))(),path:"word/_rels/document.xml.rels"},Document:{data:(()=>{const t=this.imageReplacer.replace(n,s,r);return this.numberingReplacer.replace(t,e.Numbering.ConcreteNumbering)})(),path:"word/document.xml"},Styles:{data:(()=>{const r=xa(this.formatter.format(e.Styles,{viewWrapper:e.Document,file:e,stack:[]}),{indent:t,declaration:{standalone:"yes",encoding:"UTF-8"}});return this.numberingReplacer.replace(r,e.Numbering.ConcreteNumbering)})(),path:"word/styles.xml"},Properties:{data:xa(this.formatter.format(e.CoreProperties,{viewWrapper:e.Document,file:e,stack:[]}),{indent:t,declaration:{standalone:"yes",encoding:"UTF-8"}}),path:"docProps/core.xml"},Numbering:{data:xa(this.formatter.format(e.Numbering,{viewWrapper:e.Document,file:e,stack:[]}),{indent:t,declaration:{standalone:"yes",encoding:"UTF-8"}}),path:"word/numbering.xml"},FileRelationships:{data:xa(this.formatter.format(e.FileRelationships,{viewWrapper:e.Document,file:e,stack:[]}),{indent:t,declaration:{encoding:"UTF-8"}}),path:"_rels/.rels"},HeaderRelationships:e.Headers.map(((r,n)=>{const s=xa(this.formatter.format(r.View,{viewWrapper:r,file:e,stack:[]}),{indent:t,declaration:{encoding:"UTF-8"}});return this.imageReplacer.getMediaData(s,e.Media).forEach(((e,t)=>{r.Relationships.createRelationship(t,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",`media/${e.fileName}`)})),{data:xa(this.formatter.format(r.Relationships,{viewWrapper:r,file:e,stack:[]}),{indent:t,declaration:{encoding:"UTF-8"}}),path:`word/_rels/header${n+1}.xml.rels`}})),FooterRelationships:e.Footers.map(((r,n)=>{const s=xa(this.formatter.format(r.View,{viewWrapper:r,file:e,stack:[]}),{indent:t,declaration:{encoding:"UTF-8"}});return this.imageReplacer.getMediaData(s,e.Media).forEach(((e,t)=>{r.Relationships.createRelationship(t,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",`media/${e.fileName}`)})),{data:xa(this.formatter.format(r.Relationships,{viewWrapper:r,file:e,stack:[]}),{indent:t,declaration:{encoding:"UTF-8"}}),path:`word/_rels/footer${n+1}.xml.rels`}})),Headers:e.Headers.map(((r,n)=>{const s=xa(this.formatter.format(r.View,{viewWrapper:r,file:e,stack:[]}),{indent:t,declaration:{encoding:"UTF-8"}}),i=this.imageReplacer.getMediaData(s,e.Media),o=this.imageReplacer.replace(s,i,0);return{data:this.numberingReplacer.replace(o,e.Numbering.ConcreteNumbering),path:`word/header${n+1}.xml`}})),Footers:e.Footers.map(((r,n)=>{const s=xa(this.formatter.format(r.View,{viewWrapper:r,file:e,stack:[]}),{indent:t,declaration:{encoding:"UTF-8"}}),i=this.imageReplacer.getMediaData(s,e.Media),o=this.imageReplacer.replace(s,i,0);return{data:this.numberingReplacer.replace(o,e.Numbering.ConcreteNumbering),path:`word/footer${n+1}.xml`}})),ContentTypes:{data:xa(this.formatter.format(e.ContentTypes,{viewWrapper:e.Document,file:e,stack:[]}),{indent:t,declaration:{encoding:"UTF-8"}}),path:"[Content_Types].xml"},CustomProperties:{data:xa(this.formatter.format(e.CustomProperties,{viewWrapper:e.Document,file:e,stack:[]}),{indent:t,declaration:{standalone:"yes",encoding:"UTF-8"}}),path:"docProps/custom.xml"},AppProperties:{data:xa(this.formatter.format(e.AppProperties,{viewWrapper:e.Document,file:e,stack:[]}),{indent:t,declaration:{standalone:"yes",encoding:"UTF-8"}}),path:"docProps/app.xml"},FootNotes:{data:xa(this.formatter.format(e.FootNotes.View,{viewWrapper:e.FootNotes,file:e,stack:[]}),{indent:t,declaration:{encoding:"UTF-8"}}),path:"word/footnotes.xml"},FootNotesRelationships:{data:xa(this.formatter.format(e.FootNotes.Relationships,{viewWrapper:e.FootNotes,file:e,stack:[]}),{indent:t,declaration:{encoding:"UTF-8"}}),path:"word/_rels/footnotes.xml.rels"},Settings:{data:xa(this.formatter.format(e.Settings,{viewWrapper:e.Document,file:e,stack:[]}),{indent:t,declaration:{standalone:"yes",encoding:"UTF-8"}}),path:"word/settings.xml"},Comments:{data:xa(this.formatter.format(e.Comments,{viewWrapper:e.Document,file:e,stack:[]}),{indent:t,declaration:{standalone:"yes",encoding:"UTF-8"}}),path:"word/comments.xml"}}}};var Na=r(5575);const Ra=new _a,ka=e=>(0,u.xml2js)(e,{compact:!1,captureSpacesBetweenElements:!0}),Ca=e=>{var t;return null!==(t=ka(xa(Ra.format(new ge({text:e})))).elements[0].elements)&&void 0!==t?t:[]},Oa=e=>Object.assign(Object.assign({},e),{attributes:{"xml:space":"preserve"}}),La=(e,t)=>{var r,n;return null!==(n=null===(r=e.elements)||void 0===r?void 0:r.filter((e=>e.name===t))[0].elements)&&void 0!==n?n:[]};var Da;!function(e){e[e.START=0]="START",e[e.MIDDLE=1]="MIDDLE",e[e.END=2]="END"}(Da||(Da={}));const Pa=({paragraphElement:e,renderedParagraph:t,originalText:r,replacementText:n})=>{const s=t.text.indexOf(r),i=s+r.length-1;let o=Da.START;for(const r of t.runs)for(const{text:t,index:a,start:c,end:u}of r.parts)switch(o){case Da.START:if(s>=c){const l=s-c,h=Math.min(i,u)-c,p=r.text.substring(l,h+1);if(""===p)continue;const d=t.replace(p,n);Fa(e.elements[r.index].elements[a],d),o=Da.MIDDLE;continue}break;case Da.MIDDLE:if(i<=u){const n=t.substring(i-c+1);Fa(e.elements[r.index].elements[a],n);const s=e.elements[r.index].elements[a];e.elements[r.index].elements[a]=Oa(s),o=Da.END}else Fa(e.elements[r.index].elements[a],"")}return e},Fa=(e,t)=>(e.elements=Ca(t),e),Ba=(e,t)=>{var r,n,s,i;for(let o=0;o<(null!==(r=e.elements)&&void 0!==r?r:[]).length;o++){const r=e.elements[o];if("element"===r.type&&"w:r"===r.name){const e=(null!==(n=r.elements)&&void 0!==n?n:[]).filter((e=>"element"===e.type&&"w:t"===e.name));for(const r of e)if((null===(s=r.elements)||void 0===s?void 0:s[0])&&(null===(i=r.elements[0].text)||void 0===i?void 0:i.includes(t)))return o}}throw new Error("Token not found")},Ma=(e,t)=>{var r,n;let s=0;const i=null!==(n=null===(r=e.elements)||void 0===r?void 0:r.map(((e,r)=>{var n,i;if("element"===e.type&&"w:t"===e.name){const o=(null!==(i=null===(n=e.elements)||void 0===n?void 0:n[0].text)&&void 0!==i?i:"").split(t).map((t=>Object.assign(Object.assign(Object.assign({},e),Oa(e)),{elements:Ca(t)})));return s=r,o}return e})).flat())&&void 0!==n?n:[];return{left:Object.assign(Object.assign({},JSON.parse(JSON.stringify(e))),{elements:i.slice(0,s+1)}),right:Object.assign(Object.assign({},JSON.parse(JSON.stringify(e))),{elements:i.slice(s+1)})}},Ua=new _a,Ha=(e,t,r,n,s)=>{for(const i of n){const n=t.children.map((e=>ka(xa(Ua.format(e,s))))).map((e=>e.elements[0]));switch(t.type){case Ya.DOCUMENT:{const t=za(e,i.path),r=Wa(i.path);t.elements.splice(r,1,...n);break}case Ya.PARAGRAPH:default:{const t=ja(e,i.path);Pa({paragraphElement:t,renderedParagraph:i,originalText:r,replacementText:"ɵ"});const s=Ba(t,"ɵ"),{left:o,right:a}=Ma(t.elements[s],"ɵ");t.elements.splice(s,1,o,...n,a);break}}}return e},ja=(e,t)=>{let r=e;for(let e=1;e<t.length;e++){const n=t[e],s=r.elements;if(!s)throw new Error("Could not find element");r=s[n]}return r},za=(e,t)=>ja(e,t.slice(0,t.length-1)),Wa=e=>e[e.length-1],Ga=e=>{if("w:p"!==e.element.name)throw new Error(`Invalid node type: ${e.element.name}`);if(!e.element.elements)return{text:"",runs:[],index:-1,path:[]};let t=0;const r=e.element.elements.map(((e,t)=>({element:e,i:t}))).filter((({element:e})=>"w:r"===e.name)).map((({element:e,i:r})=>{const n=Ka(e,r,t);return t+=n.text.length,n})).filter((e=>!!e)).map((e=>e));return{text:r.reduce(((e,t)=>e+t.text),""),runs:r,index:e.index,path:Va(e)}},Ka=(e,t,r)=>{if(!e.elements)return{text:"",parts:[],index:-1,start:r,end:r};let n=r;const s=e.elements.map(((e,t)=>{var r,s;return"w:t"===e.name&&e.elements&&e.elements.length>0?{text:null!==(s=null===(r=e.elements[0].text)||void 0===r?void 0:r.toString())&&void 0!==s?s:"",index:t,start:n,end:(()=>{var t,r;return n+=(null!==(r=null===(t=e.elements[0].text)||void 0===t?void 0:t.toString())&&void 0!==r?r:"").length-1,n})()}:void 0})).filter((e=>!!e)).map((e=>e));return{text:s.reduce(((e,t)=>e+t.text),""),parts:s,index:t,start:r,end:n}},Va=e=>e.parent?[...Va(e.parent),e.index]:[e.index],Xa=e=>{var t,r;return null!==(r=null===(t=e.element.elements)||void 0===t?void 0:t.map(((t,r)=>({element:t,index:r,parent:e}))))&&void 0!==r?r:[]},$a=(e,t)=>{let r=[];const n=[...Xa({element:e,index:0,parent:void 0})];let s;for(;n.length>0;)s=n.shift(),"w:p"===s.element.name?r=[...r,Ga(s)]:n.push(...Xa(s));return r.filter((e=>e.text.includes(t)))},qa=(e,t,r,n,s)=>{const i=La(e,"Relationships");return i.push({attributes:{Id:`rId${t}`,Type:r,Target:n,TargetMode:s},name:"Relationship",type:"element"}),i},Za=(e,t,r)=>{La(e,"Types").push({attributes:{ContentType:t,Extension:r},name:"Default",type:"element"})};var Ya;!function(e){e.DOCUMENT="file",e.PARAGRAPH="paragraph"}(Ya||(Ya={}));const Ja=new Ea,Qa=(e,t)=>{return r=void 0,n=void 0,i=function*(){var r,n;const s=yield va.loadAsync(e),i=new Map,o={Media:new to},a=new Map,c=[],u=[];let l=!1;const h=new Map;for(const[e,r]of Object.entries(s.files)){if(!e.endsWith(".xml")&&!e.endsWith(".rels")){h.set(e,yield r.async("nodebuffer"));continue}const n=ka(yield r.async("text"));if(e.startsWith("word/")&&!e.endsWith(".xml.rels")){const r={file:o,viewWrapper:{Relationships:{createRelationship:(t,r,n,s)=>{u.push({key:e,hyperlink:{id:t,link:n}})}}},stack:[]};i.set(e,r);for(const[s,i]of Object.entries(t.patches)){const t=`{{${s}}}`,o=$a(n,t);Ha(n,Object.assign(Object.assign({},i),{children:i.children.map((t=>{if(t instanceof Jr){const r=new Zr(t.options.children,(0,Ae.EL)());return u.push({key:e,hyperlink:{id:r.linkId,link:t.options.link}}),r}return t}))}),t,o,r)}const s=Ja.getMediaData(JSON.stringify(n),r.file.Media);s.length>0&&(l=!0,c.push({key:e,mediaDatas:s}))}a.set(e,n)}for(const{key:e,mediaDatas:t}of c){const n=`word/_rels/${e.split("/").pop()}.rels`,s=null!==(r=a.get(n))&&void 0!==r?r:tc();a.set(n,s);const i=La(s,"Relationships").map((e=>{var t,r,n;return(e=>{const t=parseInt(e.substring(3),10);return isNaN(t)?0:t})(null!==(n=null===(r=null===(t=e.attributes)||void 0===t?void 0:t.Id)||void 0===r?void 0:r.toString())&&void 0!==n?n:"")})).reduce(((e,t)=>Math.max(e,t)),0)+1,o=Ja.replace(JSON.stringify(a.get(e)),t,i);a.set(e,JSON.parse(o));for(let e=0;e<t.length;e++){const{fileName:r}=t[e];qa(s,i+e,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",`media/${r}`)}}for(const{key:e,hyperlink:t}of u){const r=`word/_rels/${e.split("/").pop()}.rels`,s=null!==(n=a.get(r))&&void 0!==n?n:tc();a.set(r,s),qa(s,t.id,"http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",t.link,xt.EXTERNAL)}if(l){const e=a.get("[Content_Types].xml");if(!e)throw new Error("Could not find content types file");Za(e,"image/png","png"),Za(e,"image/jpeg","jpeg"),Za(e,"image/jpeg","jpg"),Za(e,"image/bmp","bmp"),Za(e,"image/gif","gif")}const p=new va;for(const[e,t]of a){const r=ec(t);p.file(e,r)}for(const[e,t]of h)p.file(e,t);for(const{stream:e,fileName:t}of o.Media.Array)p.file(`word/media/${t}`,e);return p.generateAsync({type:"nodebuffer",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",compression:"DEFLATE"})},new((s=void 0)||(s=Promise))((function(e,t){function o(e){try{c(i.next(e))}catch(e){t(e)}}function a(e){try{c(i.throw(e))}catch(e){t(e)}}function c(t){var r;t.done?e(t.value):(r=t.value,r instanceof s?r:new s((function(e){e(r)}))).then(o,a)}c((i=i.apply(r,n||[])).next())}));var r,n,s,i},ec=e=>(0,u.js2xml)(e),tc=()=>({declaration:{attributes:{version:"1.0",encoding:"UTF-8",standalone:"yes"}},elements:[{type:"element",name:"Relationships",attributes:{xmlns:"http://schemas.openxmlformats.org/package/2006/relationships"},elements:[]}]})})(),n})()));
}).call(this)}).call(this,require("buffer").Buffer,require("timers").setImmediate)
},{"buffer":2,"timers":5}]},{},[6]);
