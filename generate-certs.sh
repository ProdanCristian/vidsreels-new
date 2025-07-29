#!/bin/bash

echo "Generating self-signed SSL certificates for development..."

# Generate localhost certificate
openssl req -x509 -out localhost.pem -keyout localhost-key.pem \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:192.168.1.75\nkeyUsage=keyEncipherment,dataEncipherment\nextendedKeyUsage=serverAuth")

echo "✅ SSL certificates generated:"
echo "   - localhost.pem (certificate)"
echo "   - localhost-key.pem (private key)"
echo ""
echo "🚀 You can now run: npm run https"
echo "📱 Access via: https://192.168.1.75:3001"
echo ""
echo "⚠️  You'll need to accept the self-signed certificate warning in your browser"