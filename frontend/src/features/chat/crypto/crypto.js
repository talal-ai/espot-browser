import nacl from 'tweetnacl'

export function generateKey() {
  return nacl.randomBytes(nacl.secretbox.keyLength)
}

export function toBase64(arr) {
  let bin = ''
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i])
  return btoa(bin)
}

export function fromBase64(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export function encrypt(keyB64, plaintext) {
  const key = fromBase64(keyB64)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const msgUint8 = new TextEncoder().encode(plaintext)
  const box = nacl.secretbox(msgUint8, nonce, key)
  return { ciphertext: toBase64(box), nonce: toBase64(nonce) }
}

export function decrypt(keyB64, ciphertextB64, nonceB64) {
  const key = fromBase64(keyB64)
  const nonce = fromBase64(nonceB64)
  const box = fromBase64(ciphertextB64)
  const msg = nacl.secretbox.open(box, nonce, key)
  if (!msg) return ''
  return new TextDecoder().decode(msg)
}

// Binary data encryption for images/files
export function encryptBinary(keyB64, dataUint8Array) {
  const key = fromBase64(keyB64)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const box = nacl.secretbox(dataUint8Array, nonce, key)
  return { ciphertext: toBase64(box), nonce: toBase64(nonce) }
}

export function decryptBinary(keyB64, ciphertextB64, nonceB64) {
  const key = fromBase64(keyB64)
  const nonce = fromBase64(nonceB64)
  const box = fromBase64(ciphertextB64)
  const decrypted = nacl.secretbox.open(box, nonce, key)
  return decrypted  // Returns Uint8Array
}

// Helper functions for file handling
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  return toBase64(bytes)
}

export function base64ToArrayBuffer(b64) {
  const bytes = fromBase64(b64)
  return bytes.buffer
}