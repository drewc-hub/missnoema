// Generate a random code verifier (43-128 characters)
function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

// Create code challenge from verifier
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64URLEncode(new Uint8Array(hash))
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Generate and store verifier (you'll need it later)
const codeVerifier = generateCodeVerifier()
sessionStorage.setItem('code_verifier', codeVerifier)

// Generate challenge to send in authorization request
const codeChallenge = await generateCodeChallenge(codeVerifier)
